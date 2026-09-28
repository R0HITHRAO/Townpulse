import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { NotFound } from '../pages/NotFound';

describe('NotFound Page', () => {
  it('renders the 404 heading and description', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('not_found_title')).toBeInTheDocument();
    expect(screen.getByText('not_found_desc')).toBeInTheDocument();
  });

  it('provides navigation links back to the directory', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /back_home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /view_map/i })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: /submit_listing/i })).toHaveAttribute('href', '/submit');
  });

  it('sets a meaningful document title', async () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // useSeo runs in an effect; title should be set after mount
    await vi.waitFor(() => {
      expect(document.title).toContain('not_found_title');
    });
  });
});
