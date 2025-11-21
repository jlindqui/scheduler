import { NextRequest, NextResponse } from 'next/server';
import { Index } from "@upstash/vector";
import { withAuth } from '@/app/actions/auth';

const vectorDB = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

const ALLOWED_FILE_TYPES = ['application/pdf'];

const getEmbeddings = async (text: string): Promise<number[]> => {
  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true"
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint: "https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5"
      });
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data.length || typeof data[0] !== 'number') {
      console.error("Invalid response from Hugging Face API:", data);
      throw new Error("Invalid response from Hugging Face API");
    }

    return data;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error("AI_SERVICE_UNAVAILABLE");
  }
};

// Wrap the POST handler with withAuth
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF files are allowed." }, { status: 400 });
    }

    const pdf = await import('pdf-parse');
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdf.default(buffer);
    
    // Process the PDF page by page
    const pages = pdfData.text.split(/\f/);
    
    // Generate a unique base ID for this upload
    const uploadId = crypto.randomUUID();
    
    // Process pages and chunks with rate limiting
    const results = [];
    const chunkMetadata = [];
    
    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum].trim();
      if (!pageText) continue;

      // Split page into chunks (~500 chars) while trying to maintain section context
      const chunks = pageText.match(/(?:(?:[^\n]+\n?){1,3}){1,500}/g) || [];
      
      for (let i = 0; i < chunks.length; i++) {
        // Add delay between API calls to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const chunk = chunks[i].trim();
        
        // Try to identify if this chunk starts with a section header
        const sectionMatch = chunk.match(/^(?:#{1,6}|[A-Z][A-Za-z\s]{0,50}:|\d+(?:\.\d+)*\s+[A-Z])/);
        const sectionHeader = sectionMatch ? sectionMatch[0] : undefined;

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
            isStartOfSection: !!sectionHeader
          }
        });

        chunkMetadata.push({
          vectorId,
          pageNumber: pageNum + 1,
          chunkIndex: i,
          sectionHeader,
          isStartOfSection: !!sectionHeader
        });

        results.push(result);
      }
    }

    return NextResponse.json({ 
      message: "PDF processed & stored in Upstash!", 
      pages: pages.length,
      chunks: results.length,
      uploadId,
      chunkMetadata,
      results 
    });
  } catch (error) {
    console.error("Upload Error:", error);
    
    // Check if it's our custom AI service unavailable error
    if (error instanceof Error && error.message === "AI_SERVICE_UNAVAILABLE") {
      return NextResponse.json({ 
        error: "The AI endpoints are currently facing an issue",
        details: "Please try again later"
      }, { status: 503 });
    }
    
    // For other errors, return a generic error message
    return NextResponse.json({ 
      error: "Failed to process the PDF",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    }, { status: 500 });
  }
}); 