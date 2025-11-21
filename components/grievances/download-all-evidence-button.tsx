'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface DownloadAllEvidenceButtonProps {
  grievanceId: string;
  evidenceCount?: number;
}

export default function DownloadAllEvidenceButton({ 
  grievanceId, 
  evidenceCount = 0 
}: DownloadAllEvidenceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      const response = await fetch(`/api/grievances/${grievanceId}/evidence/download-all`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download evidence');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `grievance_${grievanceId}_evidence.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading evidence:', error);
      alert(error instanceof Error ? error.message : 'Failed to download evidence. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Don't show button if no evidence
  if (evidenceCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4 mr-2" />
      {isDownloading ? 'Downloading...' : 'Download All Evidence'}
    </button>
  );
}