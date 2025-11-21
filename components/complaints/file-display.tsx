"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  X, 
  Pencil, 
  Check, 
  User
} from "lucide-react";
import { formatSmartDate } from "@/lib/utils";

export interface ComplaintFileDisplay {
  id: string;
  name: string;
  originalName: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedById?: string;
//   fileSize: number;
  fileUrl?: string;
  isEditing?: boolean;
}

interface FileDisplayProps {
  files: ComplaintFileDisplay[];
  onFileNameChange?: (fileId: string, newName: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  showActions?: boolean;
  maxFiles?: number;
  showUploadInfo?: boolean; // New prop to control whether to show upload info
}

export default function FileDisplay({
  files,
  onFileNameChange,
  onFileDelete,
  onFileDownload,
  showActions = true,
  maxFiles = 5,
  showUploadInfo = true
}: FileDisplayProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleEditStart = (file: ComplaintFileDisplay) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
  };

  const handleEditSave = () => {
    if (editingFileId && editingName.trim() && onFileNameChange) {
      onFileNameChange(editingFileId, editingName.trim());
    }
    setEditingFileId(null);
    setEditingName("");
  };

  const handleEditCancel = () => {
    setEditingFileId(null);
    setEditingName("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const displayedFiles = files.slice(0, maxFiles);
  const hasMoreFiles = files.length > maxFiles;

  return (
    <div className="space-y-2">
      {displayedFiles.map((file) => (
        <div key={file.id} className="pb-2 group">
          <div className="flex items-center space-x-3">
            <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              {editingFileId === file.id ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditSave();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditSave}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditCancel}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {file.name}
                    </span>
                    {showActions && onFileNameChange && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(file)}
                        className="h-5 w-5 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {showActions && onFileDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onFileDelete(file.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 ml-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {showUploadInfo && (
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>Added by <span className="font-medium">{file.uploadedBy}</span> on {formatSmartDate(file.uploadedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {hasMoreFiles && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            +{files.length - maxFiles} more files
          </Badge>
        </div>
      )}
    </div>
  );
} 