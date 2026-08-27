import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryChips } from '../components/CategoryChips';
import { Category } from '../services/api';

const mockCategories: Category[] = [
  { id: 1, name: 'Healthcare', icon: '🏥' },
  { id: 2, name: 'Groceries', icon: '🛒' },
  { id: 3, name: 'Mechanic', icon: '🔧' },
];

describe('CategoryChips Component', () => {
  it('renders all category chip buttons plus All Categories', () => {
    const onSelect = vi.fn();
    render(
      <CategoryChips
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelect}
      />
    );

    expect(screen.getByText('all_categories')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Mechanic')).toBeInTheDocument();
  });

  it('triggers onSelectCategory when a chip is clicked', () => {
    const onSelect = vi.fn();
    render(
      <CategoryChips
        categories={mockCategories}
        selectedCategoryId={null}
        onSelectCategory={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Healthcare'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
