import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getAnthropicModel } from '@/app/actions/llm/models';
import { z } from 'zod';

const SearchQueriesSchema = z.object({
  queries: z.array(z.string()).min(2).max(3),
});

export async function POST(request: NextRequest) {
  try {
    const { facts, statement, category, articlesViolated } = await request.json();

    console.log('[Generate Queries] Generating search queries...');

    const prompt = `Based on the following grievance case information, generate 2-3 specific search queries to find similar Canadian labour arbitration cases on CanLII. Focus on the key legal issues and facts.

Grievance Statement: ${statement}
Category: ${category}
Articles Violated: ${articlesViolated}
Established Facts: ${facts}`;

    const result = await generateObject({
      model: getAnthropicModel(),
      schema: SearchQueriesSchema,
      prompt,
    });

    console.log('[Generate Queries] Generated queries:', result.object.queries);

    return NextResponse.json({ queries: result.object.queries });
  } catch (error) {
    console.error('[Generate Queries] Error generating queries:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate search queries',
        message: error instanceof Error ? error.message : 'Unknown error',
        queries: []
      },
      { status: 500 }
    );
  }
}
