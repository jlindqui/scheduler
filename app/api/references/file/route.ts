import { NextResponse } from 'next/server';
import { getAgreementFile } from '@/app/actions/agreements';
import { requireAuth } from '@/app/actions/auth';
import { SessionError, OrganizationError } from '@/app/lib/error-handling';
import pdf from 'pdf-parse';

export async function GET(request: Request) {
  try {
    // Check authentication
    await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    if (!source) {
      return NextResponse.json({ error: 'Source is required' }, { status: 400 });
    }

    // Since getAgreementFile is already wrapped with withAuth, we can call it directly
    const fileContent = await getAgreementFile(source);
    
    if (!fileContent) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    if (source.toLowerCase().endsWith('.pdf')) {
      // For PDFs, fileContent is already a Buffer
      const pdfData = await pdf(fileContent as Buffer);
      
      return NextResponse.json({ 
        content: pdfData.text,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info
        }
      });
    }

    // For non-PDF files, convert to string if needed
    const content = fileContent instanceof Buffer ? fileContent.toString() : fileContent;
    return NextResponse.json({ content });
  } catch (error) {
    console.error('File Fetch Error:', error);
    
    // Handle specific error types
    if (error instanceof SessionError) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }
    
    if (error instanceof OrganizationError) {
      return NextResponse.json({ 
        error: 'Organization access required',
        code: 'NO_ORGANIZATION'
      }, { status: 403 });
    }
    
    // Handle other errors
    return NextResponse.json({ 
      error: 'Failed to fetch file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 