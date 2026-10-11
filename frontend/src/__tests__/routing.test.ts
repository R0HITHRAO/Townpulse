import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  formatDistance,
  formatDuration,
  getGoogleMapsNavigationUrl,
  getAppleMapsNavigationUrl,
} from '../services/routing';

describe('Routing & Navigation Service', () => {
  it('correctly calculates Haversine distance between two coordinates', () => {
    // Distance between a sample point and a nearby point (~1.1 km).
    const dist = calculateHaversineDistance(0.9716, 0.5946, 0.9816, 0.5946);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1200);
  });

  it('formats distances cleanly for UI', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(1250)).toBe('1.3 km');
    expect(formatDistance(5000)).toBe('5.0 km');
  });

  it('formats durations cleanly into readable time', () => {
    expect(formatDuration(20)).toBe('under a min');
    expect(formatDuration(60)).toBe('1 min');
    expect(formatDuration(180)).toBe('3 mins');
    expect(formatDuration(3600)).toBe('1 hr');
    expect(formatDuration(3900)).toBe('1 hr 5 mins');
  });

  it('generates accurate Google Maps and Apple Maps navigation URLs', () => {
    const googleUrl = getGoogleMapsNavigationUrl(0.9716, 0.5946, 0.9000, 0.5000);
    expect(googleUrl).toContain('google.com/maps/dir/');
    expect(googleUrl).toContain('origin=0.9,0.5');
    expect(googleUrl).toContain('destination=0.9716,0.5946');

    const appleUrl = getAppleMapsNavigationUrl(0.9716, 0.5946);
    expect(appleUrl).toContain('maps.apple.com/?daddr=0.9716,0.5946');
  });
});
