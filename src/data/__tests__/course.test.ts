import { describe, it, expect } from 'vitest';
import { COURSE_DATA } from '../course';

describe('COURSE_DATA integrity', () => {
  it('contains exactly 18 holes', () => {
    expect(COURSE_DATA).toHaveLength(18);
  });

  it('has total course par equal to 73', () => {
    const totalPar = COURSE_DATA.reduce((sum, h) => sum + h.par, 0);
    expect(totalPar).toBe(73);
  });

  it('has valid par values (3, 4, or 5) for every hole', () => {
    COURSE_DATA.forEach(hole => {
      expect([3, 4, 5]).toContain(hole.par);
    });
  });

  it('has contiguous hole numbers from 1 to 18', () => {
    const holeNumbers = COURSE_DATA.map(h => h.number);
    expect(holeNumbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it('has unique handicaps from 1 to 18', () => {
    const handicaps = COURSE_DATA.map(h => h.handicap);
    expect(new Set(handicaps).size).toBe(18);
    handicaps.forEach(hc => {
      expect(hc).toBeGreaterThanOrEqual(1);
      expect(hc).toBeLessThanOrEqual(18);
    });
  });

  it('has valid coordinate objects for tee and green on every hole', () => {
    COURSE_DATA.forEach(hole => {
      expect(hole.teeLocation).toBeDefined();
      expect(typeof hole.teeLocation?.latitude).toBe('number');
      expect(typeof hole.teeLocation?.longitude).toBe('number');

      expect(hole.greenCenter).toBeDefined();
      expect(typeof hole.greenCenter?.latitude).toBe('number');
      expect(typeof hole.greenCenter?.longitude).toBe('number');
    });
  });
});
