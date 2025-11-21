"use server";
import { fetchAgreementById } from "@/app/actions/grievances";
import {
  analyzeAgreementGrievanceFiling,
  analyzeAgreementGrievanceProcess,
  analyzeComparativeAgreements,
  analyzeIssueStatementForArticles,
  extractAgreementMetadataWithStructuredOutput,
  getAgreementAnswerFromLLM,
} from "@/app/actions/llm/agreement-actions";
import { aiDrivenSearchWithContext } from "@/app/actions/llm/agreement-search";
import {
  checkAgreementStepTemplatesExistPrisma,
  createAgreementPrisma,
  deleteAgreementPrisma,
  fetchAgreementsPagesPrisma,
  fetchAgreementsPrisma,
  fetchFilteredAgreementsPrisma,
  getAgreementStepTemplatesPrisma,
  getGrievanceTimelinesPrisma,
  saveGrievanceTimelinePrisma,
  updateAgreementDetailsPrisma,
  updateAgreementVectorIdPrisma,
} from "@/app/actions/prisma/agreement-actions";
import { storageService } from "@/app/server/services/storage-service";
import {
  createCollectiveAgreementSchema,
  idSchema,
  sanitizeHtml,
  sanitizeString,
  updateCollectiveAgreementSchema,
  validateFormData,
} from "@/app/lib/validations";
import { GrievanceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AgreementSearchResult, GrievanceFilingInfo } from "../lib/definitions";
import { withAuth } from "./auth";
import { getOrganizationId } from "./organization";
import { STORAGE_BUCKETS } from "@/app/server/services/storage-config";

// Internal implementations
async function searchAgreementInternal(
  query: string,
  agreementId: string
): Promise<AgreementSearchResult[]> {
  try {
    // Validate input parameters
    const validatedId = idSchema.parse(agreementId);
    const sanitizedQuery = sanitizeString(query);

    // Basic query validation
    if (sanitizedQuery.length === 0) {
      throw new Error("Search query cannot be empty");
    }
    if (sanitizedQuery.length > 1000) {
      throw new Error("Search query too long");
    }

    const agreement = await fetchAgreementById(validatedId);
    if (!agreement.vectorId) {
      throw new Error("No vectorId found for agreement");
    }

    // Import required modules
    const { Index } = await import("@upstash/vector");

    // Initialize vector database
    const vectorDB = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    // Get embeddings function
    const getEmbeddings = async (text: string): Promise<number[]> => {
      try {
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: text }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Hugging Face API Error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            endpoint:
              "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
          });
          throw new Error("AI_SERVICE_UNAVAILABLE");
        }

        const data = await response.json();
        if (
          !Array.isArray(data) ||
          !data.length ||
          typeof data[0] !== "number"
        ) {
          console.error("Invalid response from Hugging Face API:", data);
          throw new Error("Invalid response from Hugging Face API");
        }

        return data;
      } catch (error) {
        console.error("Embedding generation error:", error);
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }
    };

    // Convert search query to vector embedding
    const queryEmbedding = await getEmbeddings(query);

    // Detect if searching for a specific article to get more comprehensive results
    const articlePattern = /\barticle\s+\d+|\bart\.\s+\d+|\bart\s+\d+/i;
    const isArticleSearch = articlePattern.test(query.toLowerCase());

    // Return more results for article searches to ensure we get complete text
    const topK = isArticleSearch ? 10 : 5;

    // Search vector database for similar vectors with metadata filter
    const queryResponse = await vectorDB.query({
      vector: queryEmbedding,
      topK, // Return more results for article searches
      includeMetadata: true,
      filter: `uploadId = "${agreement.vectorId}"`, // Add metadata filter for this agreement
    });

    // Format the results to match the API response format
    const results = queryResponse.map((match) => ({
      text: (match.metadata?.text as string) || "No text available",
      score: match.score, // Similarity score
      metadata: {
        section: match.metadata?.section as string | undefined,
        page: match.metadata?.page as number | undefined,
        summary: undefined,
        articleNumber: undefined,
      },
    }));

    return results;
  } catch (error) {
    console.error("Search agreement error:", error);
    throw error; // Re-throw to be handled by caller
  }
}

async function getAgreementResponseInternal(
  question: string,
  agreementId: string,
  formattingPrompt?: string
): Promise<{
  searchResults: AgreementSearchResult[];
  llmAnswer: string;
}> {
  try {
    // Validate and sanitize inputs
    const validatedId = idSchema.parse(agreementId);
    const sanitizedQuestion = sanitizeString(question);
    const sanitizedFormattingPrompt = formattingPrompt
      ? sanitizeString(formattingPrompt)
      : undefined;

    // Validate question length
    if (sanitizedQuestion.length === 0) {
      throw new Error("Question cannot be empty");
    }
    if (sanitizedQuestion.length > 2000) {
      throw new Error("Question too long");
    }

    console.log(`🔍 Starting AI-driven search for: "${sanitizedQuestion}"`);

    // First attempt: try the original query
    let searchResults = await searchAgreementInternal(
      sanitizedQuestion,
      validatedId
    );
    let searchNote = "";

    console.log(`📊 Initial search found ${searchResults.length} results`);

    // Try to let AI decide if results are good enough or if we need to search again
    let llmUnavailable = false;
    try {
      const aiDecision = await aiDrivenSearchWithContext(
        sanitizedQuestion,
        searchResults,
        {
          type: "collective agreement",
          hasTableOfContents: true,
        }
      );

      // Check if LLM was unavailable
      if (aiDecision.llmError) {
        llmUnavailable = true;
        console.log("⚠️ LLM service unavailable, using vector search results directly");
      } else if (
        aiDecision.decision === "search_again" &&
        aiDecision.alternative_searches &&
        aiDecision.alternative_searches.length > 0
      ) {
        console.log(`🔄 AI suggests searching again: ${aiDecision.reasoning}`);

        const newQuery = aiDecision.alternative_searches[0]; // Try the first suggestion
        console.log(`🎯 Trying AI-suggested query: "${newQuery}"`);

        const newResults = await searchAgreementInternal(newQuery, validatedId);
        console.log(`📈 New search found ${newResults.length} results`);

        if (newResults && newResults.length > 0) {
          searchResults = newResults;
          searchNote = `*Found using AI-suggested search: "${newQuery}"*`;
        } else {
          console.log(`⚠️ AI-suggested search failed, keeping original results`);
        }
      } else {
        console.log(`✅ AI approved initial results: ${aiDecision.reasoning}`);
      }
    } catch (aiError) {
      console.warn("AI search enhancement failed, continuing with vector search results:", aiError);
      llmUnavailable = true;
      // Continue with the original search results
    }

    // If we get an error response, return early with empty results
    if (!searchResults || !Array.isArray(searchResults)) {
      console.error("Invalid search results:", searchResults);
      return {
        searchResults: [],
        llmAnswer:
          "The search service is currently unavailable. Please try again later.",
      };
    }

    if (searchResults.length === 0) {
      return {
        searchResults: [],
        llmAnswer:
          "I couldn't find any relevant sections in the agreement to answer your question. The document may not contain information about this topic, or you might try rephrasing your question with different terminology.",
      };
    }

    const relevantText = searchResults.map((r) => r.text).join("\n\n");

    // If a formatting prompt is provided, combine it with the original question
    const llmQuestion = formattingPrompt
      ? `${question}\n\n${formattingPrompt}`
      : question;

    let llmAnswer: string;

    // If LLM was already unavailable during search enhancement, skip trying to get answer
    if (llmUnavailable) {
      console.log("Skipping LLM answer generation due to previous LLM unavailability");
      // Format the search results for display
      const formattedResults = searchResults.map((result, index) => {
        return `\n\n**Result ${index + 1}:**\n${result.text}`;
      }).join('');

      llmAnswer = `The AI service is currently unavailable. Please try again later.\n\nHowever, here are the relevant sections from the agreement that were found based on your search:${formattedResults}`;
      if (searchNote) {
        llmAnswer = llmAnswer + `\n\n${searchNote}`;
      }
    } else {
      try {
        llmAnswer = await getAgreementAnswerFromLLM(
          llmQuestion,
          relevantText
        );

        // Add search note if AI suggested a different query
        if (searchNote) {
          llmAnswer = llmAnswer + `\n\n${searchNote}`;
        }
      } catch (llmError) {
        console.error("LLM processing failed:", llmError);
        // Format the search results for display
        const formattedResults = searchResults.map((result, index) => {
          return `\n\n**Result ${index + 1}:**\n${result.text}`;
        }).join('');

        // Provide fallback message but still return the search results
        llmAnswer = `The AI service is currently unavailable. Please try again later.\n\nHowever, here are the relevant sections from the agreement that were found based on your search:${formattedResults}`;

        // Add search note if we had tried an alternative search
        if (searchNote) {
          llmAnswer = llmAnswer + `\n\n${searchNote}`;
        }
      }
    }

    return {
      searchResults: searchResults.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      })),
      llmAnswer: llmAnswer,
    };
  } catch (error) {
    console.error("Failed to get agreement response:", error);
    // For complete failures (like database errors), we still return empty results
    return {
      searchResults: [],
      llmAnswer:
        "The service is currently unavailable. Please try again later.",
    };
  }
}

async function searchGrievanceFilingPeriodsInternal(
  agreementId: string
): Promise<{
  searchResults: AgreementSearchResult[];
  llmAnswer: string;
}> {
  const searchQuery = "time limit filing grievance deadline period days";

  try {
    const searchResults = await searchAgreementInternal(
      searchQuery,
      agreementId
    );

    // If we get an error response, return early with empty results
    if (!searchResults || !Array.isArray(searchResults)) {
      return {
        searchResults: [],
        llmAnswer:
          "The AI service is currently unavailable. Please try again later.",
      };
    }

    const relevantText = searchResults.map((r) => r.text).join("\n\n");

    const question =
      "What are the time limits or deadlines for filing a grievance according to this agreement? Please specify the number of days if mentioned.";
    const llmAnswer = await getAgreementAnswerFromLLM(question, relevantText);

    return {
      searchResults: searchResults.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      })),
      llmAnswer: llmAnswer as string,
    };
  } catch (error) {
    console.error("Failed to find grievance filing periods:", error);
    return {
      searchResults: [],
      llmAnswer:
        "The AI service is currently unavailable. Please try again later.",
    };
  }
}

async function searchSunsetClauseInternal(agreementId: string): Promise<{
  searchResults: AgreementSearchResult[];
  llmAnswer: string;
}> {
  const searchQuery =
    "Is there a sunset clause related to when a discipline comes off the file for an employee? For example, something like how long discipline can be used against someone";

  try {
    const searchResults = await searchAgreementInternal(
      searchQuery,
      agreementId
    );

    // If we get an error response, return early with empty results
    if (!searchResults || !Array.isArray(searchResults)) {
      return {
        searchResults: [],
        llmAnswer:
          "The AI service is currently unavailable. Please try again later.",
      };
    }

    const relevantText = searchResults.map((r) => r.text).join("\n\n");

    const question =
      "Is there a sunset clause related to when a discipline comes off the file for an employee? For example, something like how long discipline can be used against someone";
    const llmAnswer = await getAgreementAnswerFromLLM(question, relevantText);

    return {
      searchResults: searchResults.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      })),
      llmAnswer: llmAnswer as string,
    };
  } catch (error) {
    console.error("Failed to find sunset clause:", error);
    return {
      searchResults: [],
      llmAnswer:
        "The AI service is currently unavailable. Please try again later.",
    };
  }
}

async function getAgreementFileInternal(source: string) {
  if (!source) return null;

  const buffer = await storageService.getFileForProcessing("agreement", source);
  return buffer;
}

async function analyzeGrievanceForAgreementArticlesInternal(
  statement: string,
  agreementId: string,
  specificArticle?: string
): Promise<{
  suggestedArticles: string[];
  searchResults: AgreementSearchResult[];
  violationAnalysis: string;
}> {
  try {
    // Validate and sanitize inputs
    const validatedId = idSchema.parse(agreementId);
    const sanitizedStatement = sanitizeString(statement);
    const sanitizedArticle = specificArticle
      ? sanitizeString(specificArticle)
      : undefined;

    // Validate statement length
    if (sanitizedStatement.length === 0) {
      throw new Error("Grievance statement cannot be empty");
    }
    if (sanitizedStatement.length > 10000) {
      throw new Error("Grievance statement too long");
    }

    // First, get suggested articles from LLM
    const suggestedArticles =
      await analyzeIssueStatementForArticles(sanitizedStatement);

    // If a specific article is provided, use that instead of the first suggestion
    const articleToSearch = sanitizedArticle || suggestedArticles[0];
    if (!articleToSearch) {
      return {
        suggestedArticles,
        searchResults: [],
        violationAnalysis: "",
      };
    }

    // Search for the article in the vector database
    // Use a more direct query that matches the actual content structure
    const searchQuery = articleToSearch;

    const searchResults = await searchAgreementInternal(
      searchQuery,
      validatedId
    );

    // If we get an error response, return early with empty results
    if (!searchResults || !Array.isArray(searchResults)) {
      return {
        suggestedArticles,
        searchResults: [],
        violationAnalysis:
          "The search service is currently unavailable. Please try again later.",
      };
    }

    // If no search results found, try a more specific search
    if (searchResults.length === 0) {
      const specificSearchQuery = `Article ${articleToSearch}`;
      const specificResults = await searchAgreementInternal(
        specificSearchQuery,
        validatedId
      );

      if (specificResults && specificResults.length > 0) {
        searchResults.push(...specificResults);
      } else {
        return {
          suggestedArticles,
          searchResults: [],
          violationAnalysis: "No relevant sections found in the agreement.",
        };
      }
    }

    // Get all the text from the search results
    const allText = searchResults.map((r) => r.text).join("\n\n");

    // Ask the LLM to find the specific article content
    const articlePrompt = `Find the complete text that looks like it is about ${articleToSearch} in the following agreement text. Return only the actual text of the article, without any additional commentary or explanation. You can add spacing to make it read better.`;

    const llmResponse = await getAgreementAnswerFromLLM(
      articlePrompt,
      allText,
      "article"
    );

    // If the LLM couldn't find the article, return the search results
    if (!llmResponse || llmResponse.trim() === "") {
      return {
        suggestedArticles,
        searchResults,
        violationAnalysis:
          "Could not find the specific article content. Here are the relevant sections found in the agreement.",
      };
    }

    // Get a summary of the article
    const summaryPrompt = `Please provide a clear, concise summary of the following article from the collective agreement. Focus on the key points and requirements. Format the summary with bullet points for clarity.`;
    const articleSummary = await getAgreementAnswerFromLLM(
      summaryPrompt,
      llmResponse,
      "analysis"
    );

    // Analyze for potential violations
    const violationPrompt = `Based on the following agreement text and grievance statement, analyze if there appears to be a violation of the agreement. Consider:
1. What specific provisions of the agreement might have been violated
2. How the employer's actions or decisions may have contravened these provisions
3. What evidence from the statement supports this potential violation

Agreement Text:
${llmResponse}

Grievance Statement:
${sanitizedStatement}

Provide a clear analysis of potential violations, focusing on specific agreement provisions and how they relate to the grievance statement. Also, use Canadian English and output with new lines between different sections.`;

    const violationAnalysis = await getAgreementAnswerFromLLM(
      violationPrompt,
      allText,
      "analysis"
    );

    // Create a new search result with the LLM-extracted content and summary
    const extractedResult: AgreementSearchResult = {
      text: llmResponse,
      score: 1.0,
      metadata: {
        section: articleToSearch,
        summary: articleSummary,
      },
    };

    // Return both the original search results and the extracted content
    return {
      suggestedArticles,
      searchResults: [extractedResult, ...searchResults],
      violationAnalysis: violationAnalysis,
    };
  } catch (error) {
    console.error("Failed to analyze grievance for agreement articles:", error);
    return {
      suggestedArticles: [],
      searchResults: [],
      violationAnalysis:
        "The service is currently unavailable. Please try again later.",
    };
  }
}

async function createAgreementInternal(formData: FormData) {
  console.log("Starting createAgreementInternal...");

  try {
    // Validate form data using Zod schema
    const validatedData = validateFormData(
      createCollectiveAgreementSchema,
      formData
    );

    // Sanitize string inputs
    const sanitizedName = sanitizeString(validatedData.name);
    const sanitizedContent = validatedData.content
      ? sanitizeHtml(validatedData.content)
      : undefined;

    const organizationId = await getOrganizationId();
    console.log("Organization ID:", organizationId);
    console.log("Validated form data:", {
      name: sanitizedName,
      effectiveDate: validatedData.effectiveDate,
      expiryDate: validatedData.expiryDate,
    });

    // Get the filename that was uploaded client-side
    const filename = formData.get("agreement_filename") as string;
    if (!filename) {
      throw new Error(
        "No agreement filename provided. File must be uploaded first."
      );
    }

    console.log("Agreement filename:", filename);

    // Get the file from storage for processing
    const fileBuffer = await storageService.getFileForProcessing(
      "agreement",
      filename
    );

    if (!fileBuffer) {
      throw new Error("Failed to retrieve uploaded file from storage");
    }

    // Create a File object for processAgreementFileInternal
    const file = new File([new Uint8Array(fileBuffer)], filename, { type: "application/pdf" });
    console.log("File retrieved from storage:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    console.log("Starting AI vector processing...");
    const vectorResponse = await processAgreementFileInternal(file);
    console.log("Vector processing completed:", vectorResponse);

    if (!vectorResponse.uploadId) {
      throw new Error("Failed to process file for vector storage");
    }

    console.log("Creating agreement in database...");
    const agreement = await createAgreementPrisma(
      sanitizedName,
      organizationId,
      validatedData.bargainingUnitId,
      filename,
      vectorResponse.uploadId,
      vectorResponse.chunks,
      vectorResponse.pages,
      vectorResponse.chunkMetadata,
      validatedData.effectiveDate
        ? new Date(validatedData.effectiveDate)
        : new Date(),
      validatedData.expiryDate ? new Date(validatedData.expiryDate) : new Date()
    );
    console.log(
      "Agreement created successfully in database with ID:",
      agreement.id
    );

    revalidatePath("/product/settings/bargaining-units");
    revalidatePath(`/product/agreements/${agreement.id}/view`);
    console.log("Path revalidated, returning success");
    return { success: true, agreementId: agreement.id };
  } catch (error) {
    console.error("Error creating agreement:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw validation errors with original message
    if (error instanceof Error && error.message.includes("Validation failed")) {
      throw error;
    }

    throw new Error("Failed to create agreement. Please try again.");
  }
}

async function processAgreementFileInternal(file: File) {
  console.log("Starting processAgreementFileInternal...");
  try {
    // Import required modules
    console.log("Importing required modules...");
    const pdf = await import("pdf-parse");
    const { Index } = await import("@upstash/vector");
    console.log("Modules imported successfully");

    // Initialize vector database
    console.log("Initializing vector database...");
    const vectorDB = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    console.log("Vector database initialized");

    // Get embeddings function
    const getEmbeddings = async (text: string): Promise<number[]> => {
      try {
        console.log("Calling Hugging Face API for embeddings...");
        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
              "Content-Type": "application/json",
              "x-wait-for-model": "true",
            },
            body: JSON.stringify({ inputs: text }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Hugging Face API Error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            endpoint:
              "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5",
          });
          throw new Error("AI_SERVICE_UNAVAILABLE");
        }

        const data = await response.json();
        if (
          !Array.isArray(data) ||
          !data.length ||
          typeof data[0] !== "number"
        ) {
          console.error("Invalid response from Hugging Face API:", data);
          throw new Error("Invalid response from Hugging Face API");
        }

        console.log("Embeddings generated successfully");
        return data;
      } catch (error) {
        console.error("Embedding generation error:", error);
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }
    };

    // Validate file type
    const ALLOWED_FILE_TYPES = ["application/pdf"];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error("Invalid file type. Only PDF files are allowed.");
    }
    console.log("File type validated:", file.type);

    // Process the PDF
    console.log("Processing PDF...");
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Buffer created, size:", buffer.length);

    const pdfData = await pdf.default(buffer);
    console.log("PDF parsed successfully");
    console.log("PDF info:", {
      numpages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
      textLength: pdfData.text.length,
    });

    // Check if text was extracted properly
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      console.error(
        "No text extracted from PDF - this might be an image-only PDF or lazy-loaded PDF"
      );
      console.log("PDF info for debugging:", {
        numpages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata,
        textLength: pdfData.text?.length || 0,
        hasText: !!pdfData.text,
        textTrimmedLength: pdfData.text?.trim().length || 0,
      });

      // Return a more informative error with suggestions
      throw new Error(
        "No text could be extracted from the PDF. This usually means the PDF contains only images (scanned document), is password protected, or is corrupted. Try uploading a different version of the PDF or ensure it is not password protected."
      );
    }

    console.log("PDF parsed, pages:", pdfData.text.split(/\f/).length);
    console.log("PDF text length:", pdfData.text.length);
    console.log(
      "First 500 characters of PDF text:",
      pdfData.text.substring(0, 500)
    );
    console.log(
      "Last 500 characters of PDF text:",
      pdfData.text.substring(Math.max(0, pdfData.text.length - 500))
    );

    // Process the PDF page by page
    const pages = pdfData.text.split(/\f/);

    // Generate a unique base ID for this upload
    const uploadId = crypto.randomUUID();
    console.log("Generated upload ID:", uploadId);

    // Process pages and chunks with rate limiting
    const results = [];
    const chunkMetadata = [];

    console.log("Starting to process pages and chunks...");
    console.log(
      `PROGRESS_UPDATE: {"currentPage": 0, "totalPages": ${pages.length}, "status": "processing", "message": "Starting to index ${pages.length} pages..."}`
    );

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum].trim();
      console.log(`Page ${pageNum + 1} text length:`, pageText.length);

      if (!pageText) {
        console.log(`Page ${pageNum + 1} is empty, skipping`);
        continue;
      }

      console.log(`Processing page ${pageNum + 1}/${pages.length}`);
      console.log(
        `PROGRESS_UPDATE: {"currentPage": ${pageNum + 1}, "totalPages": ${pages.length}, "status": "processing", "message": "Indexing page ${pageNum + 1} of ${pages.length}..."}`
      );

      // Split page into chunks (~500 chars) while trying to maintain section context
      const chunks: string[] =
        pageText.match(/(?:(?:[^\n]+\n?){1,3}){1,500}/g) || [];
      console.log(`Page ${pageNum + 1} has ${chunks.length} chunks`);

      if (chunks.length === 0) {
        console.log(
          `No chunks found for page ${pageNum + 1}, trying alternative chunking...`
        );
        // Try alternative chunking if regex fails
        const alternativeChunks: string[] = [];
        const chunkSize = 500;
        for (let i = 0; i < pageText.length; i += chunkSize) {
          alternativeChunks.push(pageText.substring(i, i + chunkSize));
        }
        console.log(
          `Alternative chunking found ${alternativeChunks.length} chunks`
        );
        chunks.push(...alternativeChunks);
      }

      for (let i = 0; i < chunks.length; i++) {
        // Add delay between API calls to avoid rate limiting
        if (results.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const chunk = chunks[i].trim();

        // Try to identify if this chunk starts with a section header
        const sectionMatch = chunk.match(
          /^(?:#{1,6}|[A-Z][A-Za-z\s]{0,50}:|\d+(?:\.\d+)*\s+[A-Z])/
        );
        const sectionHeader = sectionMatch ? sectionMatch[0] : undefined;

        console.log(
          `Processing chunk ${i + 1}/${chunks.length} on page ${pageNum + 1}`
        );
        const embedding = await getEmbeddings(chunk);
        const vectorId = `${uploadId}-p${pageNum + 1}-chunk-${i}`;

        const result = await vectorDB.upsert({
          id: vectorId,
          vector: embedding,
          metadata: {
            text: chunk,
            uploadId,
            pageNumber: pageNum + 1,
            chunkIndex: i,
            sectionHeader,
            isStartOfSection: !!sectionHeader,
          },
        });

        chunkMetadata.push({
          vectorId,
          pageNumber: pageNum + 1,
          chunkIndex: i,
          sectionHeader,
          isStartOfSection: !!sectionHeader,
        });

        results.push(result);
      }
    }

    console.log("Vector processing completed successfully");
    return {
      message: "PDF processed & stored in Upstash!",
      pages: pages.length,
      chunks: results.length,
      uploadId,
      chunkMetadata,
      results,
    };
  } catch (error) {
    console.error("File processing error:", error);

    // Check if it's our custom AI service unavailable error
    if (error instanceof Error && error.message === "AI_SERVICE_UNAVAILABLE") {
      throw new Error(
        "The AI endpoints are currently facing an issue. Please try again later."
      );
    }

    // For other errors, throw a generic error message
    throw new Error(
      error instanceof Error ? error.message : "Failed to process the PDF"
    );
  }
}

async function fetchFilteredAgreementsInternal(
  query: string,
  currentPage: number
) {
  const organizationId = await getOrganizationId();
  return await fetchFilteredAgreementsPrisma(
    query,
    currentPage,
    organizationId
  );
}

async function analyzeGrievanceProcessInternal(
  agreementId: string,
  currentStatus: string
): Promise<{
  processInfo: string;
  nextSteps: string;
  preparationTips: string;
}> {
  const searchQuery = "grievance process procedure steps meeting";

  try {
    const searchResults = await searchAgreementInternal(
      searchQuery,
      agreementId
    );

    if (!searchResults || !Array.isArray(searchResults)) {
      return {
        processInfo:
          "The AI service is currently unavailable. Please try again later.",
        nextSteps: "",
        preparationTips: "",
      };
    }

    const relevantText = searchResults.map((r) => r.text).join("\n\n");
    return await analyzeAgreementGrievanceProcess(relevantText, currentStatus);
  } catch (error) {
    console.error("Failed to analyze grievance process:", error);
    return {
      processInfo:
        "The AI service is currently unavailable. Please try again later.",
      nextSteps: "",
      preparationTips: "",
    };
  }
}

async function processAgreementGrievanceInfoInternal(
  agreementId: string,
  forceRefresh: boolean = false
): Promise<GrievanceFilingInfo> {
  try {
    console.log(
      "Starting processAgreementGrievanceInfoInternal for agreementId:",
      agreementId
    );

    // If not forcing refresh, check if we already have templates
    if (!forceRefresh) {
      const existingTemplatesCount =
        await checkAgreementStepTemplatesExistPrisma(agreementId);
      if (existingTemplatesCount) {
        console.log("Found existing templates, returning cached data");
        // If templates exist, get them from the database
        const templates = await getAgreementStepTemplatesPrisma(agreementId);
        // Get filing period from the first step of individual grievance
        const filingPeriod =
          templates.individualGrievance.steps[0]?.timeLimit || "";
        return {
          filingPeriod,
          ...templates,
        };
      }
    }

    console.log("No existing templates found, starting AI processing...");

    const generalSearchResults = await searchAgreementInternal(
      "grievance filing period time limit deadline",
      agreementId
    );
    console.log(
      "General search results count:",
      generalSearchResults?.length || 0
    );

    if (!generalSearchResults || generalSearchResults.length === 0) {
      console.error("No grievance filing information found in the agreement");
      throw new Error("No grievance filing information found in the agreement");
    }

    const individualSearchResults = await searchAgreementInternal(
      "individual grievance process procedure steps",
      agreementId
    );
    const groupSearchResults = await searchAgreementInternal(
      "group grievance process procedure steps",
      agreementId
    );
    const policySearchResults = await searchAgreementInternal(
      "policy grievance process procedure steps",
      agreementId
    );

    console.log("Search results counts:", {
      individual: individualSearchResults?.length || 0,
      group: groupSearchResults?.length || 0,
      policy: policySearchResults?.length || 0,
    });

    const relevantText = {
      general: generalSearchResults.map((r) => r.text).join("\n\n"),
      individual: individualSearchResults.map((r) => r.text).join("\n\n"),
      group: groupSearchResults.map((r) => r.text).join("\n\n"),
      policy: policySearchResults.map((r) => r.text).join("\n\n"),
    };

    console.log("Calling analyzeAgreementGrievanceFiling...");
    const response = await analyzeAgreementGrievanceFiling(relevantText);
    console.log("Received response from analyzeAgreementGrievanceFiling");

    // Note: We no longer automatically save to database - user must review and save manually

    console.log("Successfully completed processAgreementGrievanceInfoInternal");

    return {
      filingPeriod: response.filingPeriod,
      individualGrievance: {
        description: response.individualGrievance.description,
        steps: response.individualGrievance.steps.map((step) => ({
          stepNumber: step.stepNumber,
          name: step.name,
          stage: step.stage, // Include stage determined by AI
          description: step.description,
          timeLimit: step.timeLimit,
          timeLimitDays: step.timeLimitDays,
          isCalendarDays: step.isCalendarDays,
          requiredParticipants: step.requiredParticipants,
          requiredDocuments: step.requiredDocuments,
          notes: step.notes,
        })),
      },
      groupGrievance: {
        description: response.groupGrievance.description,
        steps: response.groupGrievance.steps.map((step) => ({
          stepNumber: step.stepNumber,
          name: step.name,
          stage: step.stage, // Include stage determined by AI
          description: step.description,
          timeLimit: step.timeLimit,
          timeLimitDays: step.timeLimitDays,
          isCalendarDays: step.isCalendarDays,
          requiredParticipants: step.requiredParticipants,
          requiredDocuments: step.requiredDocuments,
          notes: step.notes,
        })),
      },
      policyGrievance: {
        description: response.policyGrievance.description,
        steps: response.policyGrievance.steps.map((step) => ({
          stepNumber: step.stepNumber,
          name: step.name,
          stage: step.stage, // Include stage determined by AI
          description: step.description,
          timeLimit: step.timeLimit,
          timeLimitDays: step.timeLimitDays,
          isCalendarDays: step.isCalendarDays,
          requiredParticipants: step.requiredParticipants,
          requiredDocuments: step.requiredDocuments,
          notes: step.notes,
        })),
      },
    };
  } catch (error) {
    console.error("Error processing agreement grievance info:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      agreementId,
    });
    throw new Error("Failed to process agreement grievance information");
  }
}

async function getComparativeAgreementResponseInternal(
  question: string,
  agreementIds: string[]
): Promise<{
  searchResults: Array<{
    agreementId: string;
    agreementName: string;
    searchResults: AgreementSearchResult[];
  }>;
  comparativeAnalysis: {
    individualFindings: Array<{
      agreementId: string;
      agreementName: string;
      provision: string;
      context: string;
    }>;
    comparativeAnalysis: string;
  };
}> {
  try {
    const searchPromises = agreementIds.map(async (agreementId) => {
      const agreement = await fetchAgreementById(agreementId);
      const results = await searchAgreementInternal(question, agreementId);
      return {
        agreementId,
        agreementName: agreement.name,
        searchResults: results,
      };
    });

    const searchResults = await Promise.all(searchPromises);
    const analysis = await analyzeComparativeAgreements(
      question,
      searchResults
    );

    return {
      searchResults,
      comparativeAnalysis: analysis,
    };
  } catch (error) {
    console.error("Failed to get comparative agreement response:", error);
    throw new Error("Failed to analyze agreements. Please try again later.");
  }
}

async function getAllAgreementsInternal() {
  const organizationId = await getOrganizationId();

  try {
    const agreements = await fetchAgreementsPrisma(organizationId);

    return agreements;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch agreements.");
  }
}

async function saveGrievanceTimelineInternal(
  agreementId: string,
  data: {
    type: GrievanceType;
    steps: Array<{
      stepNumber: number;
      name?: string;
      description: string;
      timeLimit: string;
      timeLimitDays: number;
      isCalendarDays: boolean;
      requiredParticipants: string[];
      requiredDocuments: string[];
      notes?: string;
    }>;
  }
) {
  try {
    const result = await saveGrievanceTimelinePrisma(agreementId, data);

    if (!result) {
      throw new Error("Failed to save timeline");
    }

    // Transform the data to match the expected format
    return {
      ...result,
      steps: data.steps,
    };
  } catch (error) {
    console.error("Error saving grievance timeline:", error);
    throw new Error("Failed to save grievance timeline");
  }
}

async function getGrievanceTimelinesInternal(agreementId: string) {
  try {
    const timelines = await getGrievanceTimelinesPrisma(agreementId);

    // Transform the data to match the expected format
    return timelines.map((timeline) => ({
      ...timeline,
      steps: timeline.grievances.flatMap((grievance) =>
        grievance.steps.map((step) => {
          const notes = step.notes ? JSON.parse(step.notes) : {};
          return {
            stepNumber: step.stepNumber,
            description: notes.description || "",
            timeLimit: notes.timeLimit || "",
            timeLimitDays: notes.timeLimitDays || 0,
            isCalendarDays: notes.isCalendarDays || false,
            requiredParticipants: notes.requiredParticipants || [],
            requiredDocuments: notes.requiredDocuments || [],
            notes: notes.notes,
            status: step.status,
            dueDate: step.dueDate,
            completedDate: step.completedDate,
          };
        })
      ),
    }));
  } catch (error) {
    console.error("Error fetching grievance timelines:", error);
    throw new Error("Failed to fetch grievance timelines");
  }
}

// Internal implementations
async function getAgreementsForPageInternal(
  query: string,
  currentPage: number
) {
  const organizationId = await getOrganizationId();
  return await fetchFilteredAgreementsPrisma(
    query,
    currentPage,
    organizationId
  );
}

async function getAgreementsPageCountInternal(query: string) {
  const organizationId = await getOrganizationId();
  return await fetchAgreementsPagesPrisma(query, organizationId);
}

// Exported wrapped versions
export const searchAgreement = withAuth(searchAgreementInternal);
export const getAgreementResponse = withAuth(getAgreementResponseInternal);
export const getAgreementFile = withAuth(getAgreementFileInternal);
export const analyzeGrievanceForAgreementArticles = withAuth(
  analyzeGrievanceForAgreementArticlesInternal
);
export const createAgreement = withAuth(createAgreementInternal);
export const processAgreementFile = withAuth(processAgreementFileInternal);
export const fetchFilteredAgreements = withAuth(
  fetchFilteredAgreementsInternal
);
export const processAgreementGrievanceInfo = withAuth(
  processAgreementGrievanceInfoInternal
);
export const fetchAllAgreements = withAuth(getAllAgreementsInternal);
export const saveGrievanceTimeline = withAuth(saveGrievanceTimelineInternal);
export const getGrievanceTimelines = withAuth(getGrievanceTimelinesInternal);
export const searchGrievanceFilingPeriods = withAuth(
  searchGrievanceFilingPeriodsInternal
);
export const searchSunsetClause = withAuth(searchSunsetClauseInternal);
export const analyzeGrievanceProcess = withAuth(
  analyzeGrievanceProcessInternal
);
export const getComparativeAgreementResponse = withAuth(
  getComparativeAgreementResponseInternal
);
export const getAgreementsForPage = withAuth(getAgreementsForPageInternal);
export const getAgreementsPageCount = withAuth(getAgreementsPageCountInternal);
export const getAllAgreements = withAuth(getAllAgreementsInternal);

async function getAgreementStepTemplatesInternal(agreementId: string) {
  try {
    const templates = await getAgreementStepTemplatesPrisma(agreementId);

    return templates;
  } catch (error) {
    console.error("Error fetching agreement step templates:", error);
    throw new Error("Failed to fetch agreement step templates");
  }
}

async function reprocessAgreementVectorDatabaseInternal(agreementId: string) {
  console.log(
    "Starting reprocessAgreementVectorDatabaseInternal for agreementId:",
    agreementId
  );

  try {
    // Get the agreement to find the source file
    const agreement = await fetchAgreementById(agreementId);
    console.log("Agreement found:", {
      id: agreement.id,
      name: agreement.name,
      source: agreement.source,
    });

    if (!agreement || !agreement.source) {
      throw new Error("Agreement not found or no source file available");
    }

    console.log("Fetching PDF file from storage...");
    // Get the PDF file from storage
    const buffer = await storageService.getFileForProcessing(
      "agreement",
      agreement.source
    );
    console.log("Storage buffer received:", {
      size: buffer ? buffer.byteLength : 0,
      type: "application/pdf",
    });

    if (!buffer) {
      throw new Error("Failed to fetch PDF file from storage");
    }

    // Convert buffer to File object
    const file = new File(
      [new Uint8Array(buffer)],
      agreement.source.split("/").pop() || "agreement.pdf",
      {
        type: "application/pdf",
      }
    );
    console.log("File object created:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    console.log("Processing PDF file for vector database...");
    // Process the file using the existing functionality
    const vectorResponse = await processAgreementFileInternal(file);
    console.log("Vector processing response:", vectorResponse);

    if (!vectorResponse.uploadId) {
      throw new Error("Failed to process file for vector storage");
    }

    console.log("Updating agreement with new vector ID...");
    // Update the agreement's vectorId in the database
    await updateAgreementVectorIdPrisma(
      agreementId,
      vectorResponse.uploadId,
      vectorResponse.chunks,
      vectorResponse.pages
    );

    console.log("Vector database reprocessing completed successfully");
    return {
      success: true,
      message: "Vector database rebuilt successfully",
      uploadId: vectorResponse.uploadId,
      chunks: vectorResponse.chunks,
      pages: vectorResponse.pages,
    };
  } catch (error) {
    console.error("Error reprocessing agreement vector database:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      agreementId,
    });
    throw new Error("Failed to reprocess agreement vector database");
  }
}

async function fetchAgreementsByBargainingUnitInternal(
  bargainingUnitId: string
) {
  try {
    const organizationId = await getOrganizationId();

    const agreements = await fetchAgreementsPrisma(organizationId);

    // Filter agreements by bargaining unit and sort by expiry date (newest first)
    const filteredAgreements = agreements
      .filter((agreement) => agreement.bargainingUnitId === bargainingUnitId)
      .sort((a, b) => {
        // Sort by expiry date (newest first)
        return (
          new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
        );
      });

    return filteredAgreements;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch agreements for bargaining unit.");
  }
}

async function extractAgreementMetadataFromFirstPageInternal(
  formData: FormData
): Promise<{
  name: string | null;
  startDate: string | null;
  endDate: string | null;
}> {
  const emptyResult = {
    name: null,
    startDate: null,
    endDate: null,
  };

  try {
    console.log("Starting extractAgreementMetadataFromFirstPageInternal...");

    // Get file from FormData
    const file = formData.get("file") as File;
    if (!file || !(file instanceof File)) {
      console.error("No file provided");
      return emptyResult;
    }

    if (file.type !== "application/pdf") {
      console.error("Invalid file type. Only PDF files are allowed.");
      return emptyResult;
    }

    // Basic file validation
    if (file.size === 0) {
      console.error("Empty PDF file provided");
      return emptyResult;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      console.error("PDF file too large for metadata extraction");
      return emptyResult;
    }

    console.log(
      `Processing PDF for metadata, size: ${(file.size / 1024 / 1024).toFixed(1)}MB`
    );

    // Import PDF parsing library
    const pdf = await import("pdf-parse");

    let pdfData;
    let firstPageText = "";

    // Try parsing the PDF with multiple strategies
    try {
      console.log("Attempting standard PDF parsing...");
      const buffer = Buffer.from(await file.arrayBuffer());
      pdfData = await pdf.default(buffer);
      console.log("Standard PDF parsing successful");
    } catch (pdfError) {
      console.warn("Standard PDF parsing failed, trying with error tolerance...", pdfError);

      try {
        // Try with a fresh buffer - sometimes this helps with corrupted PDFs
        const buffer = Buffer.from(await file.arrayBuffer());
        pdfData = await pdf.default(buffer);
        console.log("Second attempt PDF parsing successful");
      } catch (secondError) {
        console.error("All PDF parsing strategies failed:", secondError);
        console.error("Original error:", pdfError);

        // Return empty result instead of throwing error
        // This allows the user to continue with manual data entry
        return emptyResult;
      }
    }

    // Validate extracted text
    if (!pdfData || !pdfData.text || typeof pdfData.text !== 'string') {
      console.warn("No text data extracted from PDF");
      return emptyResult;
    }

    const textContent = pdfData.text.trim();
    if (textContent.length === 0) {
      console.warn("PDF contains no readable text - may be image-based or encrypted");
      return emptyResult;
    }

    console.log(`Total PDF text length: ${textContent.length} characters`);
    console.log(`Number of pages: ${pdfData.numpages || 'unknown'}`);

    // Extract first page text with fallback strategies
    try {
      // Strategy 1: Split by form feed character (standard page separator)
      const pages = textContent.split(/\f/);
      if (pages.length > 1 && pages[0] && pages[0].trim().length > 50) {
        firstPageText = pages[0].trim();
        console.log("Successfully extracted first page using form feed separator");
      } else {
        // Strategy 2: Take first substantial chunk of text
        console.log("Form feed separation failed, using first chunk strategy");
        firstPageText = textContent.substring(0, 4000);
      }
    } catch (pageError) {
      console.warn("Page extraction failed, using entire text chunk:", pageError);
      firstPageText = textContent.substring(0, 4000);
    }

    if (!firstPageText || firstPageText.trim().length < 20) {
      console.warn("Insufficient text content for metadata extraction");
      return emptyResult;
    }

    console.log(`First page raw length: ${firstPageText.length} characters`);

    // Clean up the text and limit to reasonable size for LLM
    try {
      firstPageText = firstPageText
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/[^\x20-\x7E\s]/g, "") // Remove non-printable characters
        .trim()
        .substring(0, 4000); // Limit to ~500-600 words

      const wordCount = firstPageText.split(/\s+/).filter(word => word.length > 0).length;
      console.log(`Cleaned text: ${wordCount} words, ${firstPageText.length} characters`);

      if (wordCount < 10) {
        console.warn("Too few words extracted for meaningful analysis");
        return emptyResult;
      }

      // Log sample of text being processed (first 200 chars)
      console.log("Sample text for LLM:", firstPageText.substring(0, 200) + "...");

      // Call LLM to extract metadata using structured output
      const llmResponse = await extractAgreementMetadataWithStructuredOutput(firstPageText);
      console.log("LLM extraction successful:", llmResponse);

      const result = {
        name: llmResponse.name || null,
        startDate: llmResponse.startDate || null,
        endDate: llmResponse.endDate || null,
      };

      console.log("Final extracted metadata:", result);
      return result;

    } catch (llmError) {
      console.error("LLM metadata extraction failed:", llmError);
      return emptyResult;
    }

  } catch (error) {
    console.error("Unexpected error in metadata extraction:", error);
    // Log the error but don't throw - return empty result to allow graceful degradation
    return emptyResult;
  }
}

async function updateAgreementDetailsInternal(
  formData: FormData
): Promise<void> {
  try {
    // Validate and sanitize input data
    const validatedData = validateFormData(
      updateCollectiveAgreementSchema,
      formData
    );

    const sanitizedName = sanitizeString(validatedData.name);
    const organizationId = await getOrganizationId();

    // Prepare update data
    const updateData: {
      name?: string;
      effectiveDate?: Date;
      expiryDate?: Date;
    } = {
      name: sanitizedName,
    };

    // Parse dates if provided
    if (validatedData.effectiveDate && validatedData.effectiveDate.trim()) {
      updateData.effectiveDate = new Date(validatedData.effectiveDate);
    }

    if (validatedData.expiryDate && validatedData.expiryDate.trim()) {
      updateData.expiryDate = new Date(validatedData.expiryDate);
    }

    await updateAgreementDetailsPrisma(
      validatedData.id,
      organizationId,
      updateData
    );

    revalidatePath("/product/settings/bargaining-units");
    revalidatePath(`/product/agreements/${validatedData.id}/view`);
  } catch (error) {
    console.error("Database Error:", error);
    if (error instanceof Error && error.message.includes("Validation failed")) {
      throw error; // Re-throw validation errors with original message
    }
    throw new Error("Failed to update agreement.");
  }
}

async function deleteAgreementInternal(formData: FormData): Promise<void> {
  try {
    // Validate and sanitize input data
    const agreementId = formData.get("id") as string;
    const validatedId = idSchema.parse(agreementId);

    await deleteAgreementPrisma(validatedId);

    revalidatePath("/product/settings/bargaining-units");
  } catch (error) {
    console.error("Database Error:", error);
    if (error instanceof Error) {
      throw error; // Re-throw with original message for specific errors
    }
    throw new Error("Failed to delete agreement.");
  }
}

// Export the functions with auth wrapper
export const getAgreementStepTemplates = withAuth(
  getAgreementStepTemplatesInternal
);
export const reprocessAgreementVectorDatabase = withAuth(
  reprocessAgreementVectorDatabaseInternal
);
export const fetchAgreementsByBargainingUnit = withAuth(
  fetchAgreementsByBargainingUnitInternal
);
export const deleteAgreement = withAuth(deleteAgreementInternal);
export const updateAgreementDetails = withAuth(updateAgreementDetailsInternal);
export const extractAgreementMetadataFromFirstPage = withAuth(
  extractAgreementMetadataFromFirstPageInternal
);
