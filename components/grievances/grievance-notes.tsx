'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createGrievanceNote, fetchGrievanceNotes, updateGrievanceNote, deleteGrievanceNote } from '@/app/actions/grievances';
import { formatSmartDateTime } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useSession } from '@/lib/auth/use-auth-session';

export interface GrievanceNote {
  id: string;
  grievanceId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface GrievanceNotesProps {
  grievanceId: string;
  initialNotes?: GrievanceNote[];
}

export default function GrievanceNotes({ grievanceId, initialNotes }: GrievanceNotesProps) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<GrievanceNote[]>(initialNotes || []);
  const [isLoading, setIsLoading] = useState(!initialNotes);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState<GrievanceNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newNoteUndoStack, setNewNoteUndoStack] = useState<string[]>([]);
  const [editUndoStack, setEditUndoStack] = useState<string[]>([]);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes on component mount (only if not prefetched)
  useEffect(() => {
    if (!initialNotes) {
      loadNotes();
    }
  }, [grievanceId, initialNotes]);

  // Auto-resize new note textarea
  useEffect(() => {
    if (showNewNoteForm && newNoteTextareaRef.current) {
      const textarea = newNoteTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
    }
  }, [newNoteContent, showNewNoteForm]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (editingNote && editTextareaRef.current) {
      const textarea = editTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
    }
  }, [editContent, editingNote]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await fetchGrievanceNotes(grievanceId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setIsCreating(true);
      const newNote = await createGrievanceNote(grievanceId, newNoteContent);
      setNotes(prev => [newNote, ...prev]);
      setNewNoteContent('');
      setShowNewNoteForm(false);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      setIsUpdating(true);
      const updatedNote = await updateGrievanceNote(editingNote.id, editContent);
      setNotes(prev => prev.map(note => 
        note.id === editingNote.id ? updatedNote : note
      ));
      setEditingNote(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteGrievanceNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (note: GrievanceNote) => {
    setEditingNote(note);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const cancelNewNote = () => {
    setShowNewNoteForm(false);
    setNewNoteContent('');
  };

  const handleNewNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (newNoteUndoStack.length > 0) {
        const previousState = newNoteUndoStack[newNoteUndoStack.length - 1];
        setNewNoteContent(previousState);
        setNewNoteUndoStack(prev => prev.slice(0, -1));
      }
      return;
    }

    // Handle Ctrl+B for bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = newNoteContent.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setNewNoteUndoStack(prev => [...prev, newNoteContent]);
        
        const newText = 
          newNoteContent.substring(0, start) + 
          `**${selectedText}**` + 
          newNoteContent.substring(end);
        setNewNoteContent(newText);
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
      const selectedText = newNoteContent.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setNewNoteUndoStack(prev => [...prev, newNoteContent]);
        
        const newText = 
          newNoteContent.substring(0, start) + 
          `*${selectedText}*` + 
          newNoteContent.substring(end);
        setNewNoteContent(newText);
        // Set cursor position after the formatted text
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 2; // 2 for the * on both sides
        }, 0);
      }
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (editUndoStack.length > 0) {
        const previousState = editUndoStack[editUndoStack.length - 1];
        setEditContent(previousState);
        setEditUndoStack(prev => prev.slice(0, -1));
      }
      return;
    }

    // Handle Ctrl+B for bold
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = editContent.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setEditUndoStack(prev => [...prev, editContent]);
        
        const newText = 
          editContent.substring(0, start) + 
          `**${selectedText}**` + 
          editContent.substring(end);
        setEditContent(newText);
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
      const selectedText = editContent.substring(start, end);
      
      if (selectedText) {
        // Save current state for undo
        setEditUndoStack(prev => [...prev, editContent]);
        
        const newText = 
          editContent.substring(0, start) + 
          `*${selectedText}*` + 
          editContent.substring(end);
        setEditContent(newText);
        // Set cursor position after the formatted text
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 2; // 2 for the * on both sides
        }, 0);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading notes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Internal Notes</CardTitle>
        {!showNewNoteForm && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowNewNoteForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* New Note Form */}
        {showNewNoteForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-3">
              <Textarea
                ref={newNoteTextareaRef}
                placeholder="Enter your note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={handleNewNoteKeyDown}
                className="resize-none"
                style={{ 
                  minHeight: '80px',
                  overflow: 'hidden'
                }}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelNewNote}
                  disabled={isCreating}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateNote}
                  disabled={!newNoteContent.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !showNewNoteForm ? (
          <div className="text-center py-8 text-gray-500">
            No notes yet.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                {editingNote?.id === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      className="resize-none"
                      style={{ 
                        minHeight: '80px',
                        overflow: 'hidden'
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateNote}
                        disabled={!editContent.trim() || isUpdating}
                      >
                        {isUpdating ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Update
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-600">
                        {formatSmartDateTime({
                          createdAt: note.createdAt,
                          updatedAt: note.updatedAt,
                          createdBy: note.user.name || 'Unknown User',
                          updatedBy: note.user.name || 'Unknown User'
                        })}
                      </div>
                      {session?.user?.id === note.userId && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(note)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 text-xs leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 pl-4 space-y-1 text-xs list-disc">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 pl-6 space-y-1 text-xs list-decimal">{children}</ol>,
                          li: ({ children, ...props }) => <li className="text-xs leading-relaxed" {...props}>{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-xs text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic text-xs">{children}</em>,
                          h1: ({ children }) => <h1 className="text-sm font-bold mb-2 mt-2 first:mt-0 text-gray-900 border-b border-gray-200 pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xs font-bold mb-2 mt-2 first:mt-0 text-gray-900">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-gray-800">{children}</h3>,
                          code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono border">{children}</code>,
                          blockquote: ({ children }) => <blockquote className="border-l-3 border-slate-400 pl-2 py-1 my-2 italic text-xs bg-gray-50 rounded-r">{children}</blockquote>,
                          table: ({ children }) => <table className="w-full text-xs border-collapse border border-gray-300 my-2">{children}</table>,
                          th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">{children}</th>,
                          td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                        }}
                      >
                        {String(note.content || '')}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 