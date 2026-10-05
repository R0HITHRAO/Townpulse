import { act, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { SubmitListing } from '../pages/SubmitListing';
import { api } from '../services/api';
import { town } from '../config/site';

describe('SubmitListing Page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading and form fields', async () => {
    vi.spyOn(api, 'getCategories').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <SubmitListing />
      </BrowserRouter>
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Submit a Local Service or Business')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Town Primary Health Center')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('e.g. Opposite Town Bus Stand, Main Road')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue(String(town.lat))).toBeInTheDocument();
    expect(screen.getByDisplayValue(String(town.lng))).toBeInTheDocument();
  });
});
