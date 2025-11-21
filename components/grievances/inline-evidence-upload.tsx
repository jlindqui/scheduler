"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, File as FileIcon, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth/use-auth-session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { storageClient } from "@/app/client/services/storage-client";

interface InlineEvidenceUploadProps {
  grievanceId: string;
  onEvidenceAdded?: () => void;
}

export default function InlineEvidenceUpload({
  grievanceId,
  onEvidenceAdded,
}: InlineEvidenceUploadProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [evidenceType, setEvidenceType] = useState<'file' | 'text'>('file');
  const [showTextForm, setShowTextForm] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const maxTextLength = 100000; // 100k characters

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsSubmitting(true);
      setError(null);

      try {
        // Upload files one by one
        for (const file of acceptedFiles) {
          await storageClient.createBulkEvidence(grievanceId, [file]);
        }

        // Refresh the page to show new evidence
        router.refresh();

        // Call callback if provided
        if (onEvidenceAdded) {
          onEvidenceAdded();
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        setError(error instanceof Error ? error.message : 'Failed to upload files');
      } finally {
        setIsSubmitting(false);
      }
    },
    [grievanceId, router, onEvidenceAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: maxFileSize,
    disabled: isSubmitting,
    multiple: true,
  });

  const handleAddTextEvidence = async () => {
    if (!textContent.trim()) {
      setError('Content is required');
      return;
    }

    if (textContent.length > maxTextLength) {
      setError(`Text length exceeds the maximum limit of ${maxTextLength} characters`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('type', 'Text');
      formData.append('name', ''); // Empty name - AI will generate it
      formData.append('source', textContent.trim());
      formData.append('date', new Date().toISOString());
      formData.append('grievanceId', grievanceId);

      await storageClient.createEvidence(formData);

      // Reset form
      setTextContent('');
      setShowTextForm(false);

      // Refresh the page to show new evidence
      router.refresh();

      // Call callback if provided
      if (onEvidenceAdded) {
        onEvidenceAdded();
      }
    } catch (error) {
      console.error('Error creating text evidence:', error);
      setError(error instanceof Error ? error.message : 'Failed to create text evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTextEvidence = () => {
    setTextContent('');
    setShowTextForm(false);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Evidence Type Selection */}
      <div className="flex gap-2">
        <Button
          variant={evidenceType === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setEvidenceType('file');
            setShowTextForm(false);
            setError(null);
          }}
          disabled={isSubmitting}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
        <Button
          variant={evidenceType === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setEvidenceType('text');
            setShowTextForm(true);
            setError(null);
          }}
          disabled={isSubmitting}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Add Text Evidence
        </Button>
      </div>

      {/* File Upload Section */}
      {evidenceType === 'file' && !showTextForm && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input {...getInputProps()} />
          {isSubmitting ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
              <p className="text-base text-gray-700">Uploading...</p>
            </>
          ) : (
            <>
              <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-base text-gray-700">
                  {isDragActive ? "Drop your files here" : "Drag and drop files here, or click to select"}
                </p>
                <p className="text-xs text-gray-400">
                  Accepted formats: PDF, DOC, DOCX, TXT, JPG, PNG (max {Math.round(maxFileSize / (1024 * 1024))}MB per file)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Text Evidence Section */}
      {evidenceType === 'text' && showTextForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="space-y-2">
            <Label htmlFor="textContent" className="text-sm font-medium">
              Evidence Content <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your text evidence here..."
                className="min-h-[150px] resize-none"
                disabled={isSubmitting}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
                {textContent.length}/{maxTextLength}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTextEvidence}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddTextEvidence}
              disabled={!textContent.trim() || isSubmitting}
              className="bg-slate-700 hover:bg-slate-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Text Evidence'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
