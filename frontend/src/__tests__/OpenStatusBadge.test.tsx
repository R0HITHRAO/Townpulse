import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenStatusBadge } from '../components/OpenStatusBadge';

describe('OpenStatusBadge Component', () => {
  it('renders Open Now for 24/7 businesses', () => {
    render(<OpenStatusBadge hours={{ all_days: 'Open 24/7' }} />);
    expect(screen.getByText(/Open Now/i)).toBeDefined();
  });

  it('renders Closed for closed businesses', () => {
    render(<OpenStatusBadge hours={{ all_days: 'Closed' }} />);
    expect(screen.getByText(/Closed/i)).toBeDefined();
  });
});
