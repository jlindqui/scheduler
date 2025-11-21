import { NextRequest, NextResponse } from 'next/server';
import { splitPDFByTabs } from '@/app/lib/pdf-utils';
import { requireSuperAdmin } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and super admin status
    await requireSuperAdmin();

    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Split the PDF by tabs
    const results = await splitPDFByTabs(buffer);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error splitting PDF:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to split PDF';
    if (error instanceof Error) {
      if (error.message.includes('bad XRef entry') || error.message.includes('XRef')) {
        errorMessage = 'PDF file appears to be corrupted or damaged. Please try with a different PDF file.';
      } else if (error.message.includes('InvalidPDFException')) {
        errorMessage = 'Invalid PDF file format. Please ensure the file is a valid PDF.';
      } else if (error.message.includes('PDF contains no pages')) {
        errorMessage = 'PDF file contains no pages to process.';
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