import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from '../components/SearchBar';

describe('SearchBar Component', () => {
  it('renders search input field with placeholder', () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('triggers onSearch callback when form is submitted', () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'dental clinic' } });

    const submitBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(submitBtn);

    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'dental clinic' })
    );
  });

  it('allows changing search radius selector', () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '25000' } });

    expect(select).toHaveValue('25000');
  });
});
