import { Index } from "@upstash/vector";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/actions/auth";

// Initialize connection to vector database
const vectorDB = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

/**
 * Helper function to convert text into vector embeddings using HuggingFace
 */
const getEmbeddings = async (text: string): Promise<number[]> => {
  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/BAAI/bge-base-en-v1.5", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
        "Content-Type": "application/json",
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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth();

    // Get the search query and uploadId from the request
    const { query, vectorId } = await request.json();
    
    // Convert search query to vector embedding
    const queryEmbedding = await getEmbeddings(query);
        
    // Search vector database for similar vectors with metadata filter
    const queryResponse = await vectorDB.query({
      vector: queryEmbedding,
      topK: 5, // Return top 5 most similar results
      includeMetadata: true,
      filter: vectorId ? `uploadId = "${vectorId}"` : undefined // Add metadata filter if uploadId is provided
    });

    // Format the results
    const results = queryResponse.map(match => ({
      text: match.metadata?.text || "No text available",
      score: match.score, // Similarity score
      metadata: {
        section: match.metadata?.section,
        page: match.metadata?.page,
        uploadId: match.metadata?.uploadId,
        article: match.metadata?.article || "Unknown Article"
      }
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search Error:", error);
    
    // Handle auth errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ 
        error: "Authentication required",
        code: "SESSION_EXPIRED"
      }, { status: 401 });
    }
    
    // Check if it's our custom AI service unavailable error
    if (error instanceof Error && error.message === "AI_SERVICE_UNAVAILABLE") {
      return NextResponse.json({ 
        error: "The AI endpoints are currently facing an issue",
        details: "Please try again later"
      }, { status: 503 });
    }
    
    // For other errors, return a generic error message
    return NextResponse.json({ 
      error: "Failed to search vector database",
      details: "An unexpected error occurred"
    }, { status: 500 });
  }
}
