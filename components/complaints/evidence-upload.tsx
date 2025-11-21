"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Plus, File as FileIcon } from "lucide-react";
import { useSession } from "@/lib/auth/use-auth-session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileDisplay from "./file-display";

export interface ComplaintFile {
  id: string;
  file: File;
  name: string;
  uploadedAt: Date;
  uploadedBy: string;
  isEditing?: boolean;
}

export interface TextEvidence {
  id: string;
  name: string;
  content: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export type EvidenceItem = ComplaintFile | TextEvidence;

interface EvidenceUploadProps {
  files: ComplaintFile[];
  textEvidence: TextEvidence[];
  onFilesChange: (files: ComplaintFile[]) => void;
  onTextEvidenceChange: (textEvidence: TextEvidence[]) => void;
  onFileRemove: (fileId: string) => void;
  onTextEvidenceRemove: (textId: string) => void;
  onFileNameChange: (fileId: string, newName: string) => void;
  onTextEvidenceNameChange: (textId: string, newName: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  initialMode?: 'file' | 'text';
}

export default function EvidenceUpload({
  files,
  textEvidence,
  onFilesChange,
  onTextEvidenceChange,
  onFileRemove,
  onTextEvidenceRemove,
  onFileNameChange,
  onTextEvidenceNameChange,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedFileTypes = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".jpg",
    ".jpeg",
    ".png",
  ],
  initialMode = 'file',
}: EvidenceUploadProps) {
  const { data: session } = useSession();
  const [dragActive, setDragActive] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'file' | 'text'>(initialMode);
  const [showTextForm, setShowTextForm] = useState(false);
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const currentUser = session?.user;
      const newFiles: ComplaintFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        uploadedAt: new Date(),
        uploadedBy: currentUser?.name || "Unknown User",
        isEditing: false,
      }));
      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange, session]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles,
    maxSize: maxFileSize,
    disabled: files.length >= maxFiles,
  });

  const handleAddTextEvidence = async () => {
    if (!textContent.trim() || !textName.trim()) return;

    const currentUser = session?.user;
    const newTextEvidence: TextEvidence = {
      id: `${Date.now()}-${Math.random()}`,
      name: textName.trim(),
      content: textContent.trim(),
      uploadedAt: new Date(),
      uploadedBy: currentUser?.name || "Unknown User",
    };

    // Add to local state immediately for UI feedback
    onTextEvidenceChange([...textEvidence, newTextEvidence]);
    
    // Reset form
    setTextName('');
    setTextContent('');
    setShowTextForm(false);
  };

  const handleCancelTextEvidence = () => {
    setTextName('');
    setTextContent('');
    setShowTextForm(false);
  };

  const allEvidence: EvidenceItem[] = [...files, ...textEvidence].sort((a, b) => {
    const aTime = (a.uploadedAt instanceof Date) ? a.uploadedAt.getTime() : new Date(a.uploadedAt).getTime();
    const bTime = (b.uploadedAt instanceof Date) ? b.uploadedAt.getTime() : new Date(b.uploadedAt).getTime();
    return bTime - aTime; // Most recent first
  });

  return (
    <div className="space-y-4">
      {/* Evidence Type Selection */}
      <div className="flex gap-2">
        <Button
          variant={evidenceType === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setEvidenceType('file');
            setShowTextForm(false);
          }}
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
          }}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Add Text Evidence
        </Button>
      </div>

      {/* File Upload Section */}
      {evidenceType === 'file' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${
            files.length >= maxFiles
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          }`}
        >
          <input {...getInputProps()} />
          <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-base text-gray-700">
              {isDragActive ? "Drop your file here" : "Drag and drop your file here, or click to select"}
            </p>
            <p className="text-sm text-gray-400">Supports any file type</p>
            {files.length >= maxFiles && (
              <p className="text-sm text-red-500">Maximum {maxFiles} files allowed</p>
            )}
          </div>
        </div>
      )}


      {/* Text Evidence Section */}
      {evidenceType === 'text' && showTextForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="textName">Evidence Name <span className="text-red-500">*</span></Label>
            <Input
              id="textName"
              type="text"
              value={textName}
              onChange={(e) => setTextName(e.target.value)}
              placeholder="e.g., Witness Statement, Meeting Notes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textContent">Evidence Content <span className="text-red-500">*</span></Label>
            <Textarea
              id="textContent"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text evidence here..."
              className="min-h-[150px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleAddTextEvidence}
              disabled={!textContent.trim() || !textName.trim()}
            >
              Save Text Evidence
            </Button>
          </div>
        </div>
      )}

      {/* Evidence List */}
      {allEvidence.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-sm font-medium text-gray-900">Supporting Evidence:</h4>
          <FileDisplay
            files={allEvidence.map((item) => ({
              id: item.id,
              name: item.name,
              originalName: 'file' in item ? item.file.name : 'Text Evidence',
              uploadedAt: item.uploadedAt,
              uploadedBy: item.uploadedBy,
              fileUrl: 'file' in item ? item.file.name : undefined,
              isEditing: false,
            }))}
            onFileDelete={(id) => {
              // Check if it's a file or text evidence
              const isFile = files.some(f => f.id === id);
              if (isFile) {
                onFileRemove(id);
              } else {
                onTextEvidenceRemove(id);
              }
            }}
            onFileNameChange={(id, newName) => {
              // Check if it's a file or text evidence
              const isFile = files.some(f => f.id === id);
              if (isFile) {
                onFileNameChange(id, newName);
              } else {
                onTextEvidenceNameChange(id, newName);
              }
            }}
            showActions={true}
            maxFiles={maxFiles}
            showUploadInfo={false}
          />
        </div>
      )}
    </div>
  );
}
