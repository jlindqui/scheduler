'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  BookOpen, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { extractEstablishedFacts, updateEstablishedFacts, saveEditedFacts } from '@/app/actions/established-facts';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import type { Evidence, Grievor, WorkInformation } from '@/app/lib/definitions';
import { useInvalidateEstablishedFacts } from '@/hooks/use-established-facts';
import { formatSmartDateTime } from '@/lib/utils';

interface EstablishedFacts {
  id: string;
  grievanceId: string;
  facts: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EstablishedFactsProps {
  grievanceId: string;
  statement: string;
  evidence: Evidence[];
  grievors: Grievor[];
  workInformation: WorkInformation;
  articlesViolated?: string;
  settlementDesired?: string;
  initialFacts?: EstablishedFacts | null;
  grievanceType?: string;
  showButtonsAtBottom?: boolean;
}

export default function EstablishedFacts({
  grievanceId,
  statement,
  evidence,
  grievors,
  workInformation,
  articlesViolated,
  settlementDesired,
  initialFacts,
  grievanceType,
  showButtonsAtBottom = false
}: EstablishedFactsProps) {
  const [facts, setFacts] = useState<EstablishedFacts | null>(initialFacts || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFacts, setEditedFacts] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const { invalidateFacts } = useInvalidateEstablishedFacts();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textarea.style.height = `${Math.max(400, textarea.scrollHeight)}px`;
    }
  }, [editedFacts, isEditing]);

  const handleExtractFacts = async () => {
    setIsLoading(true);
    try {
      const result = await extractEstablishedFacts(
        grievanceId,
        statement,
        evidence,
        grievors,
        workInformation,
        articlesViolated,
        settlementDesired,
        grievanceType
      );

      if (result.success && result.facts) {
        setFacts(result.facts);
        // Invalidate the cache so other components get the updated facts
        await invalidateFacts(grievanceId);
        toast({
          title: "Success",
          description: "Established facts extracted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to extract established facts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error extracting facts:', error);
      toast({
        title: "Error",
        description: "Failed to extract established facts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFacts = async () => {
    setIsLoading(true);
    try {
      const result = await updateEstablishedFacts(
        grievanceId,
        statement,
        evidence,
        grievors,
        workInformation,
        articlesViolated,
        settlementDesired,
        grievanceType
      );

      if (result.success && result.facts) {
        setFacts(result.facts);
        // Invalidate the cache so other components get the updated facts
        await invalidateFacts(grievanceId);
        toast({
          title: "Success",
          description: "Established facts updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update established facts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating facts:', error);
      toast({
        title: "Error",
        description: "Failed to update established facts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = () => {
    setEditedFacts(facts?.facts || '');
    setIsEditing(true);
    // If no facts exist yet, create an empty facts object to enable editing
    if (!facts) {
      setFacts({
        id: '',
        grievanceId: grievanceId,
        facts: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedFacts('');
    // If facts were empty (temporary object created), revert to null
    if (facts?.id === '') {
      setFacts(null);
    }
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      const result = await saveEditedFacts(grievanceId, editedFacts);

      if (result.success && result.facts) {
        setFacts(result.facts);
        setIsEditing(false);
        setEditedFacts('');
        // Invalidate the cache so other components get the updated facts
        await invalidateFacts(grievanceId);
        toast({
          title: "Success",
          description: "Facts saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save facts",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving facts:', error);
      toast({
        title: "Error",
        description: "Failed to save facts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (undoStack.length > 0) {
        const previousState = undoStack[undoStack.length - 1];
        setEditedFacts(previousState);
        setUndoStack(prev => prev.slice(0, -1));
      }
      return;
    }

    // Handle Ctrl+B for bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = editedFacts.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setUndoStack(prev => [...prev, editedFacts]);
        
        const newText = 
          editedFacts.substring(0, start) + 
          `**${selectedText}**` + 
          editedFacts.substring(end);
        setEditedFacts(newText);
        // Set cursor position after the formatted text
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 4; // 4 for the ** on both sides
        }, 0);
      }
    }
    
    // Handle Ctrl+I for italic
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = editedFacts.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setUndoStack(prev => [...prev, editedFacts]);
        
        const newText = 
          editedFacts.substring(0, start) + 
          `*${selectedText}*` + 
          editedFacts.substring(end);
        setEditedFacts(newText);
        // Set cursor position after the formatted text
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 2; // 2 for the * on both sides
        }, 0);
      }
    }
  };

  if (!facts) {
    return (
      <div className="space-y-4">
        {evidence.length > 1 ? (
          <Button
            onClick={handleExtractFacts}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {isLoading ? 'Extracting Facts...' : 'Extract Facts'}
          </Button>
        ) : (
          <div className="text-sm text-gray-600">
            <p>No facts have been entered yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              disabled={isLoading}
              className="flex items-center gap-2 mt-2"
            >
              <Edit3 className="h-4 w-4" />
              Add Facts Manually
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render action buttons
  const actionButtons = (
    <div className="flex items-center gap-2">
      {!isEditing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpdateFacts}
        disabled={isLoading || isEditing}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {isLoading ? 'Updating...' : 'Update'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {!showButtonsAtBottom && actionButtons}

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={editedFacts}
            onChange={(e) => setEditedFacts(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Edit the facts..."
            className="font-mono text-sm resize-none"
            style={{
              minHeight: '400px',
              overflow: 'hidden'
            }}
            disabled={isLoading}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold mb-3 text-gray-900 border-b border-gray-200 pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4 text-gray-800">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-3 text-gray-700">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3">{children}</ol>,
                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
              }}
            >
              {facts.facts}
            </ReactMarkdown>
          </div>
          {showButtonsAtBottom && (
            <div className="flex items-center gap-2 justify-end pt-4 border-t border-gray-200">
              {actionButtons}
            </div>
          )}
        </>
      )}
    </div>
  );
}