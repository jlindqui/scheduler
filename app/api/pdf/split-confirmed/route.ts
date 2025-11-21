import { NextRequest, NextResponse } from 'next/server';
import { splitPDFWithConfirmedTabs } from '@/app/lib/pdf-utils';
import { requireSuperAdmin } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and super admin status
    await requireSuperAdmin();

    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const tabPagesJson = formData.get('tabPages') as string;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (!tabPagesJson) {
      return NextResponse.json({ error: 'No tab pages specified' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    let tabPages: number[];
    try {
      tabPages = JSON.parse(tabPagesJson);
      if (!Array.isArray(tabPages) || !tabPages.every(p => typeof p === 'number' && p > 0)) {
        throw new Error('Invalid tab pages format');
      }
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid tab pages format. Must be an array of positive numbers.' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Split the PDF with confirmed tab pages
    const results = await splitPDFWithConfirmedTabs(buffer, tabPages);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error splitting PDF with confirmed tabs:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to split PDF';
    if (error instanceof Error) {
      if (error.message.includes('bad XRef entry') || error.message.includes('XRef')) {
        errorMessage = 'PDF file appears to be corrupted or damaged during splitting.';
      } else if (error.message.includes('InvalidPDFException')) {
        errorMessage = 'Invalid PDF file format during splitting.';
      } else if (error.message.includes('No tab pages specified')) {
        errorMessage = 'No tab pages were specified for splitting.';
      } else if (error.message.includes('Authentication required')) {
        errorMessage = 'Authentication required to access this feature.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}