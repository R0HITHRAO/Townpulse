import { describe, it, expect } from 'vitest';
import { getOpenStatus } from '../utils/businessHours';

describe('businessHours Utility', () => {
  it('identifies 24/7 businesses as open', () => {
    const res = getOpenStatus({ all_days: 'Open 24/7' });
    expect(res.isOpen).toBe(true);
    expect(res.statusText).toBe('Open 24/7');
  });

  it('identifies closed businesses', () => {
    const res = getOpenStatus({ all_days: 'Closed' });
    expect(res.isOpen).toBe(false);
    expect(res.statusText).toBe('Closed Today');
  });

  it('handles empty or missing hours gracefully', () => {
    const res = getOpenStatus(null);
    expect(res.isOpen).toBe(true);
    expect(res.statusText).toBe('Hours not specified');
  });
});
