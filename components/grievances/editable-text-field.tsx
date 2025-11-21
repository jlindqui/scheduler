'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableTextFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  onCancel?: () => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  startEditing?: boolean;
  initialValue?: string;
}

export default function EditableTextField({ 
  value, 
  onSave, 
  onCancel,
  label, 
  placeholder = '', 
  required = false,
  startEditing = false,
  initialValue
}: EditableTextFieldProps) {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [editedValue, setEditedValue] = useState(initialValue || value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (startEditing) {
      setIsEditing(true);
      setEditedValue(initialValue || value);
    } else {
      setIsEditing(false);
      setEditedValue(value);
    }
  }, [startEditing, initialValue, value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">{label}</h2>
        <div 
          className="prose max-w-none bg-gray-50 rounded-xl p-6 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
          onClick={() => setIsEditing(true)}
        >
          <p className="text-gray-900 whitespace-pre-wrap">{value || <span className="text-gray-400 italic">No {label.toLowerCase()} provided</span>}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">{label}</h2>
      <div className="prose max-w-none bg-gray-50 rounded-xl p-6">
        <textarea
          ref={textareaRef}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[200px] p-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={placeholder}
          required={required}
          disabled={isSaving}
        />
        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
} 