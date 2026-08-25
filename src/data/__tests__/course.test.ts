import { describe, it, expect } from 'vitest';
import { COURSES_DATA, COURSE_DATA, DEFAULT_COURSE_ID, getCourseById } from '../course';

describe('COURSES_DATA integrity', () => {
  it('contains at least 2 courses with Cabeza de Caballo as default', () => {
    expect(COURSES_DATA.length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_COURSE_ID).toBe("1");
    expect(getCourseById("1").course_name).toBe("Cabeza de Caballo");
    expect(getCourseById("2").course_name).toBe("Ocaragua Golf Club");
    expect(getCourseById("non-existent").course_name).toBe("Cabeza de Caballo");
  });

  describe('Cabeza de Caballo (Course 1)', () => {
    const course = getCourseById("1");

    it('contains exactly 18 holes', () => {
      expect(course.holes).toHaveLength(18);
    });

    it('has total course par equal to 73', () => {
      const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
      expect(totalPar).toBe(73);
      expect(course.par).toBe(73);
    });

    it('has valid par values (3, 4, or 5) for every hole', () => {
      course.holes.forEach(hole => {
        expect([3, 4, 5]).toContain(hole.par);
      });
    });

    it('has contiguous hole numbers from 1 to 18', () => {
      const holeNumbers = course.holes.map(h => h.number);
      expect(holeNumbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    });

    it('has unique handicaps from 1 to 18', () => {
      const handicaps = course.holes.map(h => h.handicap);
      expect(new Set(handicaps).size).toBe(18);
    });

    it('has valid coordinate objects for tee and green on every hole', () => {
      course.holes.forEach(hole => {
        expect(hole.teeLocation).toBeDefined();
        expect(typeof hole.teeLocation?.latitude).toBe('number');
        expect(typeof hole.teeLocation?.longitude).toBe('number');

        expect(hole.greenCenter).toBeDefined();
        expect(typeof hole.greenCenter?.latitude).toBe('number');
        expect(typeof hole.greenCenter?.longitude).toBe('number');
      });
    });
  });

  describe('Ocaragua Golf Club (Course 2)', () => {
    const course = getCourseById("2");

    it('contains exactly 18 holes', () => {
      expect(course.holes).toHaveLength(18);
    });

    it('has total course par equal to 73', () => {
      const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
      expect(totalPar).toBe(73);
      expect(course.par).toBe(73);
    });

    it('has valid par values (3, 4, 5, or 6) for every hole', () => {
      course.holes.forEach(hole => {
        expect([3, 4, 5, 6]).toContain(hole.par);
      });
    });

    it('has contiguous hole numbers from 1 to 18', () => {
      const holeNumbers = course.holes.map(h => h.number);
      expect(holeNumbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    });

    it('has valid handicaps for every hole', () => {
      course.holes.forEach(h => {
        expect(h.handicap).toBeDefined();
        expect(h.handicap).toBeGreaterThanOrEqual(1);
        expect(h.handicap).toBeLessThanOrEqual(18);
      });
    });

    it('has coordinate objects defined for every hole (initialized to 0)', () => {
      course.holes.forEach(hole => {
        expect(hole.teeLocation).toBeDefined();
        expect(hole.greenCenter).toBeDefined();
      });
    });
  });

  describe('COURSE_DATA backwards compatibility alias', () => {
    it('aliases Cabeza de Caballo holes', () => {
      expect(COURSE_DATA).toHaveLength(18);
      expect(COURSE_DATA).toBe(COURSES_DATA[0].holes);
    });
  });
});
