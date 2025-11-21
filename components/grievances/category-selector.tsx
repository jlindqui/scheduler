'use client';

import { useState } from 'react';
import { GRIEVANCE_CATEGORIES } from '@/app/lib/definitions';
import { useUpdateGrievanceCategory } from '@/hooks/use-grievances';

interface CategorySelectorProps {
  grievanceId: string;
  currentCategory: string | null;
}

export default function CategorySelector({ 
  grievanceId, 
  currentCategory 
}: CategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || '');
  const updateCategoryMutation = useUpdateGrievanceCategory();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    
    // Optimistic UI update
    setSelectedCategory(newCategory);
    
    // Create form data
    const formData = new FormData();
    formData.append('grievance_id', grievanceId);
    formData.append('category', newCategory);
    
    try {
      // Use React Query mutation - it handles optimistic updates automatically
      await updateCategoryMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Error updating category:', error);
      // Revert the optimistic update on error
      setSelectedCategory(currentCategory || '');
    }
  };

  return (
    <select
      id="category"
      name="category"
      className="text-sm text-gray-500 rounded-lg px-2 py-1 pr-8 border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
      value={selectedCategory}
      onChange={handleChange}
      disabled={updateCategoryMutation.isPending}
    >
      <option value="">Category</option>
      {GRIEVANCE_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
} 