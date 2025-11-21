"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { updateComplaint } from "@/app/actions/complaints";

interface EditableContentSectionProps {
  complaintId: string;
  title: string;
  icon: React.ReactNode;
  field: string;
  value: string | string[];
  status: string;
  placeholder?: string;
  isTextarea?: boolean;
  noCard?: boolean;
  onContentUpdate?: (field: string, value: any) => void;
}

export default function EditableContentSection({
  complaintId,
  title,
  icon,
  field,
  value,
  status,
  placeholder,
  isTextarea = true,
  noCard = false,
  onContentUpdate,
}: EditableContentSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Local state to track the current displayed value
  const [currentValue, setCurrentValue] = useState(value);
  
  const [editValue, setEditValue] = useState(
    Array.isArray(currentValue) ? currentValue.join(", ") : currentValue || ""
  );

  // Update currentValue when the value prop changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // Update editValue when currentValue changes (but not when editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(Array.isArray(currentValue) ? currentValue.join(", ") : currentValue || "");
    }
  }, [currentValue, isEditing]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formDataToSubmit = new FormData();
      
      if (field === "articlesViolated") {
        const articles = editValue.split(",").map(article => article.trim()).filter(article => article.length > 0);
        formDataToSubmit.append(field, articles.join(","));
      } else {
        formDataToSubmit.append(field, editValue);
      }

      await updateComplaint(complaintId, formDataToSubmit);

      // Update local state immediately to reflect the saved value
      const newValue = field === "articlesViolated" 
        ? editValue.split(",").map(article => article.trim()).filter(article => article.length > 0)
        : editValue;
      
      setCurrentValue(newValue);

      // Call parent callback to update state immediately
      if (onContentUpdate) {
        onContentUpdate(field, newValue);
      }

      toast({
        title: `${title} Updated`,
        description: `The ${title.toLowerCase()} has been successfully updated.`,
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${title.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(Array.isArray(currentValue) ? currentValue.join(", ") : currentValue || "");
    setIsEditing(false);
  };

  // Auto-cancel editing if status becomes non-editable
  useEffect(() => {
    if (status === "GRIEVED" || status === "CLOSED" || status === "DELETED") {
      setIsEditing(false);
      setEditValue(Array.isArray(currentValue) ? currentValue.join(", ") : currentValue || "");
    }
  }, [status, currentValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
  };

  // Calculate dynamic height based on content length
  const getTextareaHeight = () => {
    const contentLength = editValue.length;
    const lineCount = editValue.split('\n').length;
    
    // Base height: 120px for short content
    // Scale up based on content length and line count
    if (contentLength < 200) return "120px";
    if (contentLength < 500) return "200px";
    if (contentLength < 1000) return "300px";
    if (contentLength < 2000) return "400px";
    if (contentLength < 3000) return "500px";
    
    // For very long content, calculate based on approximate lines
    const estimatedLines = Math.max(lineCount, Math.ceil(contentLength / 80));
    return `${Math.min(estimatedLines * 24 + 48, 800)}px`; // Max 800px
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <>
          <Textarea
            value={editValue}
            onChange={handleChange}
            className="resize-none bg-gray-50 p-4 rounded-lg"
            style={{ minHeight: getTextareaHeight() }}
            placeholder={placeholder}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </>
      );
    }

    if (currentValue && currentValue.toString().trim()) {
      return (
        <div className="text-sm leading-relaxed bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
          {currentValue.toString()}
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-500 italic">
        {field === "articlesViolated" ? "No articles violated specified" : `No ${title.toLowerCase()} provided`}
      </div>
    );
  };

  const content = (
    <>
      <div className={noCard ? "pb-2" : ""}>
        <div className={`text-lg flex items-center justify-between ${noCard ? "" : ""}`}>
          <div className="flex items-center font-semibold">
            {icon}
            {title}
          </div>
          {!isEditing && status !== "GRIEVED" && status !== "CLOSED" && status !== "DELETED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className={noCard ? "pb-4" : ""}>
        {renderContent()}
      </div>
    </>
  );

  if (noCard) {
    return <div className="py-3">{content}</div>;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            {title}
          </div>
          {!isEditing && status !== "GRIEVED" && status !== "CLOSED" && status !== "DELETED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
