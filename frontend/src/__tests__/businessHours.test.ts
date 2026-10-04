import { describe, it, expect } from 'vitest';
import { getOpenStatus } from '../utils/businessHours';

// Fixed instants: 2026-01-05 is a Monday, 2026-01-09 a Friday. Passing `now`
// keeps these tests independent of the machine's clock and timezone.
const monday10 = new Date(2026, 0, 5, 10, 0);
const monday13 = new Date(2026, 0, 5, 13, 0);
const monday17 = new Date(2026, 0, 5, 17, 0);
const friday23 = new Date(2026, 0, 9, 23, 0);

describe('businessHours Utility', () => {
  it('identifies 24/7 businesses as open', () => {
    const res = getOpenStatus({ all_days: 'Open 24/7' }, monday10);
    expect(res.state).toBe('open');
    expect(res.isOpen).toBe(true);
    expect(res.statusText).toBe('Open 24/7');
  });

  it('identifies closed businesses', () => {
    const res = getOpenStatus({ all_days: 'Closed' }, monday10);
    expect(res.state).toBe('closed');
    expect(res.isOpen).toBe(false);
    expect(res.statusText).toBe('Closed Today');
  });

  it('never reports missing hours as open (AUDIT.md 4.4)', () => {
    const res = getOpenStatus(null, monday10);
    expect(res.state).toBe('unknown');
    expect(res.isOpen).toBeNull();
    expect(res.statusText).toBe('Hours not specified');
  });

  it('never reports unreadable hours as open', () => {
    const res = getOpenStatus({ all_days: 'by appointment only' }, monday10);
    expect(res.state).toBe('unknown');
    expect(res.isOpen).toBeNull();
  });

  it('reads OSM day-prefixed ranges instead of mangling them (AUDIT.md 4.5)', () => {
    // The old parser split on /[-–—to]/i — a character class that also
    // matched the letters "t" and "o" — so this exact value from
    // listings.json was silently reported as always open.
    const hours = { all_days: 'Mo-Su 08:00-22:00' };
    expect(getOpenStatus(hours, monday10).state).toBe('open');
    expect(getOpenStatus(hours, friday23).state).toBe('closed');
  });

  it('handles lunch-closure multi-ranges', () => {
    const hours = { all_days: '10:00-12:00, 16:00-19:00' };
    expect(getOpenStatus(hours, monday13).state).toBe('closed');
    expect(getOpenStatus(hours, monday17).state).toBe('open');
  });

  it('handles 12-hour clock text', () => {
    const hours = { all_days: '9:00 AM - 6:00 PM' };
    expect(getOpenStatus(hours, monday10).state).toBe('open');
    expect(getOpenStatus(hours, friday23).state).toBe('closed');
  });

  it('treats "9-5" as a daytime shift, not an overnight one', () => {
    const hours = { all_days: '9-5' };
    expect(getOpenStatus(hours, monday10).state).toBe('open');
    expect(getOpenStatus(hours, monday13).state).toBe('open');
  });

  it('handles overnight shifts past midnight', () => {
    const hours = { all_days: '20:00-02:00' };
    const monday01 = new Date(2026, 0, 5, 1, 0);
    expect(getOpenStatus(hours, monday01).state).toBe('open');
    expect(getOpenStatus(hours, monday13).state).toBe('closed');
  });

  it("prefers the row for today over general rows", () => {
    const hours = { monday: 'Closed', all_days: '09:00-18:00' };
    expect(getOpenStatus(hours, monday10).state).toBe('closed');
    expect(getOpenStatus(hours, new Date(2026, 0, 9, 10, 0)).state).toBe('open');
  });
});
