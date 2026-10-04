import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenStatusBadge } from '../components/OpenStatusBadge';

describe('OpenStatusBadge Component', () => {
  it('renders an open state for 24/7 businesses', () => {
    render(<OpenStatusBadge hours={{ all_days: 'Open 24/7' }} />);
    expect(screen.getByText(/open/i)).toBeDefined();
  });

  it('renders a closed state for closed businesses', () => {
    render(<OpenStatusBadge hours={{ all_days: 'Closed' }} />);
    expect(screen.getByText(/closed/i)).toBeDefined();
  });

  it('renders an unknown state — never "open" — when hours are missing', () => {
    render(<OpenStatusBadge hours={null} />);
    expect(screen.getByText(/hours/i)).toBeDefined();
    expect(screen.queryByText(/open/i)).toBeNull();
  });
});
