'use server';

import { Buffer } from 'buffer';
import { withAuth } from './auth';

async function parsePdfFileInternal(pdfData: ArrayBuffer): Promise<string> {
  try {
    const pdfBuffer = Buffer.from(pdfData);
    
    // Check if the buffer contains valid PDF header
    const pdfHeader = pdfBuffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF file: Missing PDF header');
    }
    
    const pdf = require('pdf-parse');
    const data = await pdf(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error parsing PDF:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF') || error.message.includes('InvalidPDFException')) {
        throw new Error('The PDF file is corrupted or in an invalid format. Please check the file and try again.');
      } else if (error.message.includes('PDF header')) {
        throw new Error('The uploaded file is not a valid PDF document.');
      }
    }
    
    throw new Error('Failed to parse PDF file. The file may be corrupted or password-protected.');
  }
} 

export const parsePdfFile = withAuth(parsePdfFileInternal);
