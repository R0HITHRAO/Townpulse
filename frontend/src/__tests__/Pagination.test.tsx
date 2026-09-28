import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../components/Pagination';

describe('Pagination Component', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders numbered page buttons', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: `Page ${i}` })).toBeInTheDocument();
    }
  });

  it('marks the current page with aria-current', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
  });

  it('calls onPageChange when a page button is clicked', () => {
    const handleChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('disables previous on first page and next on last page', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('calls onPageChange from prev/next arrows', () => {
    const handleChange = vi.fn();
    render(<Pagination page={2} totalPages={4} onPageChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(handleChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('collapses long page ranges with an ellipsis', () => {
    render(<Pagination page={5} totalPages={12} onPageChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument();
    // Far-away pages are collapsed
    expect(screen.queryByRole('button', { name: 'Page 8' })).not.toBeInTheDocument();
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });
});
