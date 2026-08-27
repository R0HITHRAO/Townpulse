import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EmergencyAlertBanner } from '../components/EmergencyAlertBanner';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getActiveAlerts: vi.fn(),
  },
}));

describe('EmergencyAlertBanner Component', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders active emergency alerts returned from API', async () => {
    (api.getActiveAlerts as any).mockResolvedValueOnce([
      {
        id: 'alert-1',
        title: 'River Flood Alert',
        message: 'High water levels detected in sector 4.',
        severity: 'critical',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);

    render(<EmergencyAlertBanner />);

    await waitFor(() => {
      expect(screen.getByText(/River Flood Alert/i)).toBeDefined();
      expect(screen.getByText(/High water levels detected/i)).toBeDefined();
    });
  });
});
