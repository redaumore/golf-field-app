import { describe, it, expect } from 'vitest';
import { calculateDistance } from '../geo';

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { latitude: -34.6037, longitude: -58.3816 };
    expect(calculateDistance(point, point)).toBe(0);
  });

  it('calculates distance between known points in yards correctly', () => {
    // Buenos Aires Obelisco to Plaza de Mayo (~1 km / ~1094 yards)
    const obelisco = { latitude: -34.6037, longitude: -58.3816 };
    const plazaDeMayo = { latitude: -34.6084, longitude: -58.3721 };

    const distance = calculateDistance(obelisco, plazaDeMayo);
    // Approximately 1000 - 1200 yards
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1300);
  });

  it('is symmetric regardless of order of points', () => {
    const p1 = { latitude: -34.5, longitude: -58.5 };
    const p2 = { latitude: -34.6, longitude: -58.6 };

    expect(calculateDistance(p1, p2)).toBe(calculateDistance(p2, p1));
  });

  it('handles zero coordinates without throwing', () => {
    const zero = { latitude: 0, longitude: 0 };
    expect(calculateDistance(zero, zero)).toBe(0);
  });
});
