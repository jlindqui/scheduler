"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useSession } from "@/lib/auth/use-auth-session";
import FileDisplay from "./file-display";

export interface ComplaintFile {
  id: string;
  file: File;
  name: string;
  uploadedAt: Date;
  uploadedBy: string;
  isEditing?: boolean;
}

interface FileUploadProps {
  files: ComplaintFile[];
  onFilesChange: (files: ComplaintFile[]) => void;
  onFileRemove: (fileId: string) => void;
  onFileNameChange: (fileId: string, newName: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

export default function FileUpload({
  files,
  onFilesChange,
  onFileRemove,
  onFileNameChange,
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
}: FileUploadProps) {
  const { data: session } = useSession();
  const [dragActive, setDragActive] = useState(false);

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





  return (
    <div className="space-y-4">
      {/* Upload Area */}
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
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? "Drop files here" : "Upload files"}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop files here, or click to select files
          </p>
          <p className="text-xs text-gray-400">
            Accepted formats: {acceptedFileTypes.join(", ")} (max{" "}
            {Math.round(maxFileSize / (1024 * 1024))}MB)
          </p>
          {files.length >= maxFiles && (
            <p className="text-sm text-red-500">
              Maximum {maxFiles} files allowed
            </p>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3 mt-4">
          <FileDisplay
            files={files.map((file) => ({
              id: file.id,
              name: file.name,
              originalName: file.file.name,
              uploadedAt: file.uploadedAt,
              uploadedBy: file.uploadedBy,
              fileUrl: file.file.name,
              isEditing: false,
            }))}
            onFileDelete={onFileRemove}
            onFileNameChange={onFileNameChange}
            showActions={true}
            maxFiles={maxFiles}
            showUploadInfo={false}
          />
        </div>
      )}
    </div>
  );
}
