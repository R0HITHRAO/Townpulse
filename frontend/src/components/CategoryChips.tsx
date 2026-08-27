import React from 'react';
import { Category } from '../services/api';
import { useTranslation } from 'react-i18next';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none py-1">
      {/* All Categories Chip */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition shadow-sm ${
          selectedCategoryId === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        <span>🌟</span>
        <span>{t('all_categories')}</span>
      </button>

      {/* Individual Categories */}
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id === selectedCategoryId ? null : cat.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition shadow-sm ${
            selectedCategoryId === cat.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>{cat.icon || '📍'}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  );
};
