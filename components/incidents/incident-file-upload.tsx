"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  X,
  Edit2,
  Check,
  Calendar,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { useSession } from "@/lib/auth/use-auth-session";

export interface IncidentFile {
  id: string;
  file: File;
  name: string;
  uploadedAt: Date;
  uploadedBy: string;
  isEditing?: boolean;
}

interface FileUploadProps {
  files: IncidentFile[];
  onFilesChange: (files: IncidentFile[]) => void;
  onFileRemove: (fileId: string) => void;
  onFileNameChange: (fileId: string, newName: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

export default function IncidentFileUpload({
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
      const newFiles: IncidentFile[] = acceptedFiles.map((file) => ({
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

  const handleFileNameEdit = (fileId: string) => {
    onFilesChange(
      files.map((file) =>
        file.id === fileId ? { ...file, isEditing: true } : file
      )
    );
  };

  const handleFileNameSave = (fileId: string, newName: string) => {
    if (newName.trim()) {
      onFileNameChange(fileId, newName.trim());
      onFilesChange(
        files.map((file) =>
          file.id === fileId ? { ...file, isEditing: false } : file
        )
      );
    }
  };

  const handleFileNameCancel = (fileId: string) => {
    onFilesChange(
      files.map((file) =>
        file.id === fileId ? { ...file, isEditing: false } : file
      )
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf")
      return <FileText className="h-4 w-4" />;
    if (file.type.startsWith("image/")) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Upload Files</Label>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${files.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? "Drop files here"
            : "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Accepted files: {acceptedFileTypes.join(", ")} (max{" "}
          {formatFileSize(maxFileSize)})
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files</Label>
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getFileIcon(file.file)}
                    <div className="flex-1 min-w-0">
                      {file.isEditing ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={file.name}
                            onChange={(e) =>
                              onFilesChange(
                                files.map((f) =>
                                  f.id === file.id
                                    ? { ...f, name: e.target.value }
                                    : f
                                )
                              )
                            }
                            className="text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleFileNameSave(file.id, file.name)
                            }
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFileNameCancel(file.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium truncate">
                            {file.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFileNameEdit(file.id)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {file.uploadedBy}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(file.uploadedAt, "MMM dd, yyyy HH:mm")}
                        </span>
                        <span>{formatFileSize(file.file.size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {file.file.type.split("/")[1]?.toUpperCase() || "FILE"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onFileRemove(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
