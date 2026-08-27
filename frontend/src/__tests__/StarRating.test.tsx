import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from '../components/StarRating';

describe('StarRating Component', () => {
  it('renders 5 stars by default', () => {
    render(<StarRating rating={4} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('triggers onRatingChange callback on click when interactive', () => {
    const handleRating = vi.fn();
    render(<StarRating rating={3} interactive onRatingChange={handleRating} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]); // Click 5th star
    expect(handleRating).toHaveBeenCalledWith(5);
  });
});
