import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/actions/auth';
import { storageService } from '@/app/server/services/storage-service';
import { fetchEvidenceByGrievanceIdPrisma } from '@/app/actions/prisma/evidence-actions';
import { fetchGrievanceDetails } from '@/app/actions/grievances';
import { getOrganizationId } from '@/app/actions/organization';
import JSZip from 'jszip';

export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: grievanceId } = await params;
    
    if (!grievanceId) {
      return NextResponse.json({ error: 'Grievance ID is required' }, { status: 400 });
    }

    // Verify the grievance belongs to the user's organization
    const organizationId = await getOrganizationId();
    const grievanceDetails = await fetchGrievanceDetails(grievanceId);
    
    if (!grievanceDetails) {
      return NextResponse.json({ error: 'Grievance not found or access denied' }, { status: 404 });
    }

    // Fetch all evidence for this grievance
    const evidence = await fetchEvidenceByGrievanceIdPrisma(grievanceId);
    
    console.log(`Found ${evidence?.length || 0} evidence items for grievance ${grievanceId}`);
    
    if (!evidence || evidence.length === 0) {
      return NextResponse.json({ error: 'No evidence found for this grievance' }, { status: 404 });
    }

    // Create a new JSZip instance
    const zip = new JSZip();
    
    // Filter evidence that has actual files (not just text evidence)
    const fileEvidence = evidence.filter(item => 
      item.type === 'File' && 
      item.source && 
      !item.source.startsWith('File uploaded:') && 
      item.source !== item.name
    );

    console.log(`Filtered to ${fileEvidence.length} file evidence items:`, 
      fileEvidence.map(item => ({ id: item.id, name: item.name, source: item.source, type: item.type }))
    );

    if (fileEvidence.length === 0) {
      return NextResponse.json({ error: 'No file evidence found for this grievance' }, { status: 404 });
    }

    // Download each file and add to zip
    let totalSize = 0;
    const maxZipSize = 100 * 1024 * 1024; // 100MB limit
    
    for (let i = 0; i < fileEvidence.length; i++) {
      const item = fileEvidence[i];
      try {
        // Pass the evidence ID, not the source
        const fileBuffer = await storageService.getEvidenceFileForProcessing(item.id);
        
        // Check if adding this file would exceed size limit
        if (totalSize + fileBuffer.length > maxZipSize) {
          console.warn(`Skipping file ${item.name} - would exceed 100MB zip limit`);
          continue;
        }
        
        // Create a safe filename
        const fileExtension = item.source.split('.').pop() || 'file';
        const safeFileName = `${i + 1}_${item.name.replace(/[^a-zA-Z0-9\-_\s]/g, '_')}.${fileExtension}`;
        
        zip.file(safeFileName, fileBuffer);
        totalSize += fileBuffer.length;
        console.log(`Added file ${safeFileName} to zip (${fileBuffer.length} bytes, total: ${totalSize})`);
      } catch (error) {
        console.error(`Error downloading file ${item.id} (${item.source}):`, error);
        // Continue with other files even if one fails
      }
    }

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `grievance_${grievanceId}_evidence_${timestamp}.zip`;

    // Return the zip file
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error creating evidence zip:', error);
    return NextResponse.json(
      { error: 'Failed to create evidence archive' },
      { status: 500 }
    );
  }
});