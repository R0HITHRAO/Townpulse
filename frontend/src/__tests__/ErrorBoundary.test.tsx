import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Bomb: React.FC = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  beforeAll(() => {
    // Silence the expected React error logs from the crashing child
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    (console.error as any).mockRestore?.();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
    expect(screen.getByText('Directory Home')).toHaveAttribute('href', '/');
  });
});
