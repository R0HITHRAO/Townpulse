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
          type="button"
          onClick={() => handleScroll('left')}
          className="tp-btn-icon absolute left-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full shadow-[var(--tp-shadow-md)]"
          aria-label="Scroll categories left"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
      )}

      {/* Categories Horizontal Track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* All Categories Chip */}
        <button
          type="button"
          aria-pressed={selectedCategoryId === null}
          onClick={() => onSelectCategory(null)}
          className={`group/chip flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition-all ${
            selectedCategoryId === null
              ? 'border-[var(--tp-primary)] bg-[var(--tp-primary)] text-[var(--tp-on-primary)] shadow-[var(--tp-shadow-xs)]'
              : 'border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)] hover:bg-[var(--tp-surface-2)]'
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">
            ✳
          </span>
          <span>{t('all_categories')}</span>
        </button>

        {/* Individual Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`group/chip flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition-all ${
                isSelected
                  ? 'border-[var(--tp-accent)] bg-[var(--tp-accent)] text-[var(--tp-on-accent)] shadow-[var(--tp-shadow-xs)]'
                  : 'border-[var(--tp-border)] bg-[var(--tp-surface)] text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)] hover:bg-[var(--tp-surface-2)]'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {cat.icon || '📍'}
              </span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow button */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="tp-btn-icon absolute right-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full shadow-[var(--tp-shadow-md)]"
          aria-label="Scroll categories right"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
