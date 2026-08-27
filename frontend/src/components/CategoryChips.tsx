import React, { useRef, useState, useEffect } from 'react';
import { Category } from '../services/api';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative group w-full">
      {/* Left scroll arrow button */}
      {showLeftArrow && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:scale-105 transition"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Categories Horizontal Track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
      >
        {/* All Categories Chip */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${
            selectedCategoryId === null
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/80'
          }`}
        >
          <span>🌟</span>
          <span>{t('all_categories')}</span>
        </button>

        {/* Individual Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-blue-500/20 ring-2 ring-blue-600 ring-offset-1'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200/90 hover:border-gray-300'
              }`}
            >
              <span className="text-sm leading-none">{cat.icon || '📍'}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow button */}
      {showRightArrow && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:scale-105 transition"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
