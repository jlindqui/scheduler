import { NextRequest, NextResponse } from 'next/server';
import { searchCanlii } from '@/app/actions/llm/canlii-search';

export async function POST(request: NextRequest) {
  try {
    const { facts, statement, category, articlesViolated, queries } = await request.json();

    // If queries are provided, use them directly
    // Otherwise, let the server action generate them
    const resultsByQuery = await searchCanlii({
      facts,
      statement,
      category,
      articlesViolated,
      ...(queries && { providedQueries: queries }),
    });

    return NextResponse.json({ resultsByQuery });
  } catch (error) {
    console.error('[CanLII Search] Error in CanLII search:', error);
    return NextResponse.json(
      {
        error: 'Failed to search CanLII',
        message: error instanceof Error ? error.message : 'Unknown error',
        resultsByQuery: []
      },
      { status: 500 }
    );
  }
}
