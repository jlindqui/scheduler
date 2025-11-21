import { NextRequest, NextResponse } from 'next/server';
import { reprocessEvidence } from '@/app/actions/evidence';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params;
    
    if (!evidenceId) {
      return NextResponse.json(
        { error: 'Evidence ID is required' },
        { status: 400 }
      );
    }
    
    const result = await reprocessEvidence(evidenceId);
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Reprocess failed:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}