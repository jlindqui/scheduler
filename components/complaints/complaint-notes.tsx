'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatSmartDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createComplaintNote, fetchComplaintNotes, updateComplaintNote, deleteComplaintNote } from '@/app/actions/complaint-notes';
import ReactMarkdown from 'react-markdown';
import { useSession } from '@/lib/auth/use-auth-session';

interface ComplaintNote {
  id: string;
  complaintId: string;
  userId: string;
  title: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface ComplaintNotesProps {
  complaintId: string;
  isDeleted?: boolean;
  status?: string; // New prop for complaint status
  noCard?: boolean; // Option to render without card wrapper
}

export default function ComplaintNotes({ complaintId, isDeleted = false, status, noCard = false }: ComplaintNotesProps) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<ComplaintNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState<ComplaintNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newNoteUndoStack, setNewNoteUndoStack] = useState<string[]>([]);
  const [editUndoStack, setEditUndoStack] = useState<string[]>([]);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, [complaintId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await fetchComplaintNotes(complaintId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading complaint notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setIsCreating(true);
      const newNote = await createComplaintNote(complaintId, newNoteContent.trim());
      setNotes(prev => [newNote, ...prev]);
      setNewNoteContent('');
      setShowNewNoteForm(false);
      setNewNoteUndoStack([]);
    } catch (error) {
      console.error('Error creating complaint note:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      setIsUpdating(true);
      const updatedNote = await updateComplaintNote(editingNote.id, editContent.trim());
      setNotes(prev => prev.map(note => note.id === editingNote.id ? updatedNote : note));
      setEditingNote(null);
      setEditContent('');
      setEditUndoStack([]);
    } catch (error) {
      console.error('Error updating complaint note:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      setIsDeleting(true);
      await deleteComplaintNote(noteToDelete);
      setNotes(prev => prev.filter(note => note.id !== noteToDelete));
      setShowDeleteDialog(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting complaint note:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteNote = () => {
    setShowDeleteDialog(false);
    setNoteToDelete(null);
  };

  const startEditing = (note: ComplaintNote) => {
    setEditingNote(note);
    setEditContent(note.content);
    setEditUndoStack([]);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
    setEditUndoStack([]);
  };

  const handleNewNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateNote();
    } else if (e.key === 'Escape') {
      setShowNewNoteForm(false);
      setNewNoteContent('');
      setNewNoteUndoStack([]);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleUpdateNote();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleNewNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewNoteContent(value);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditUndoStack(prev => [...prev, editContent]);
    setEditContent(value);
  };

  const undoNewNote = () => {
    if (newNoteUndoStack.length > 0) {
      const previousValue = newNoteUndoStack[newNoteUndoStack.length - 1];
      setNewNoteUndoStack(prev => prev.slice(0, -1));
      setNewNoteContent(previousValue);
    }
  };

  const undoEdit = () => {
    if (editUndoStack.length > 0) {
      const previousValue = editUndoStack[editUndoStack.length - 1];
      setEditUndoStack(prev => prev.slice(0, -1));
      setEditContent(previousValue);
    }
  };

  const getUserDisplayName = (user: { name: string | null; email: string | null }) => {
    return user.name || user.email?.split('@')[0] || 'Unknown User';
  };

  if (isLoading) {
    const loadingContent = (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );

    if (noCard) {
      return <div className="py-4">{loadingContent}</div>;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📝</span>
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>{loadingContent}</CardContent>
      </Card>
    );
  }

  const headerContent = noCard ? (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1">
          <span className="text-lg font-semibold">
            Notes ({notes.length})
          </span>
        </div>
        {!showNewNoteForm && status === "OPEN" && !isDeleted && (
          <Button
            onClick={() => setShowNewNoteForm(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 ml-2 h-7 text-xs px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
        )}
      </div>
    </div>
  ) : (
    <CardTitle className="flex items-center justify-between">
      <div className="flex items-center min-w-0 flex-1">
        <span className="mr-2">📝</span>
        <span className="truncate">Notes ({notes.length})</span>
      </div>
      {!showNewNoteForm && status === "OPEN" && !isDeleted && (
        <Button
          onClick={() => setShowNewNoteForm(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 ml-2 h-7 text-xs px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Note
        </Button>
      )}
    </CardTitle>
  );

  const mainContent = (
    <div className="space-y-4 flex-1 overflow-y-auto">
        {/* New Note Form */}
        {showNewNoteForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="space-y-3">
              <Textarea
                ref={newNoteTextareaRef}
                value={newNoteContent}
                onChange={handleNewNoteChange}
                onKeyDown={handleNewNoteKeyDown}
                placeholder="Add a new note..."
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim() || isCreating}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Save Note
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewNoteForm(false);
                      setNewNoteContent('');
                      setNewNoteUndoStack([]);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  {/* Undo removed for new note form */}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📝</span>
            <p>No notes yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`border rounded-lg p-4 ${session?.user?.id && note.userId !== session.user.id ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}
              >
                {editingNote?.id === note.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <Textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={handleEditChange}
                      onKeyDown={handleEditKeyDown}
                      className="min-h-[100px] resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleUpdateNote}
                          disabled={!editContent.trim() || isUpdating}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2"
                        >
                          {isUpdating ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        {editUndoStack.length > 0 && (
                          <Button
                            onClick={undoEdit}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                          >
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-900 text-sm">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="break-words">{note.content}</span>
                          </div>
                          {session?.user?.id === note.userId && status === "OPEN" && !isDeleted && (
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <Button
                                onClick={() => startEditing(note)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteNote(note.id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                disabled={isDeleting}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            {formatSmartDateTime({
                              createdAt: note.createdAt,
                              updatedAt: note.updatedAt,
                              createdBy: note.user?.name || note.user?.email || 'Unknown User',
                              updatedBy: note.user?.name || note.user?.email || 'Unknown User'
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );

  const deleteDialog = (
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cancelDeleteNote} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDeleteNote} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              'Delete Note'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (noCard) {
    return (
      <div className="h-full flex flex-col">
        {headerContent}
        {mainContent}
        {deleteDialog}
      </div>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          {headerContent}
        </CardHeader>
        <CardContent className="space-y-4 flex-1 overflow-y-auto">
          {mainContent}
        </CardContent>
      </Card>
      {deleteDialog}
    </>
  );
}

