import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { SubmitListing } from '../pages/SubmitListing';

describe('SubmitListing Page', () => {
  it('renders heading and form fields', () => {
    render(
      <BrowserRouter>
        <SubmitListing />
      </BrowserRouter>
    );

    expect(screen.getByText('Submit a Local Service or Business')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Town Primary Health Center')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Opposite Town Bus Stand, Main Road')).toBeInTheDocument();
  });
});
