'use client';

import { useState, useEffect } from 'react';
import EditableTextField from './editable-text-field';
import { updateGrievanceField } from '@/app/actions/grievances';

interface EditableGrievanceFieldProps {
  grievanceId: string;
  field: 'statement' | 'articlesViolated' | 'settlementDesired';
  value: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  startEditing?: boolean;
  initialValue?: string;
  'data-field'?: string;
  onCancel?: () => void;
}

export default function EditableGrievanceField({
  grievanceId,
  field,
  value,
  label,
  placeholder,
  required,
  startEditing = false,
  initialValue,
  'data-field': dataField,
  onCancel
}: EditableGrievanceFieldProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);

  useEffect(() => {
    if (startEditing && !isEditing) {
      setIsEditing(true);
      if (initialValue) {
        setEditedValue(initialValue);
      }
    }
  }, [startEditing, initialValue, isEditing]);

  const handleSave = async (newValue: string) => {
    setIsSaving(true);
    try {
      await updateGrievanceField(grievanceId, field, newValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValue(value);
    onCancel?.();
  };

  return (
    <div data-field={dataField}>
      <EditableTextField
        value={value}
        onSave={handleSave}
        onCancel={handleCancel}
        label={label}
        placeholder={placeholder}
        required={required}
        startEditing={isEditing}
        initialValue={editedValue}
      />
    </div>
  );
} 