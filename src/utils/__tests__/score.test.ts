import { describe, it, expect } from 'vitest';
import { calculateRelativeScore, calculateScoreDistribution } from '../score';
import { COURSE_DATA } from '../../data/course';
import type { HoleScore } from '../../types';

describe('calculateRelativeScore', () => {
  it('returns 0 when all played holes are at par', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 3, putts: 1 }, // Par 4 (3+1=4)
      2: { holeNumber: 2, approachShots: 3, putts: 1 }, // Par 4 (3+1=4)
      3: { holeNumber: 3, approachShots: 2, putts: 1 }, // Par 3 (2+1=3)
    };
    expect(calculateRelativeScore(COURSE_DATA, scores)).toBe(0);
  });

  it('returns +1 when 1 stroke over par total', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 3, putts: 2 }, // Par 4, score 5 (+1)
    };
    expect(calculateRelativeScore(COURSE_DATA, scores)).toBe(1);
  });

  it('returns -1 for a birdie', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 2, putts: 1 }, // Par 4, score 3 (-1)
    };
    expect(calculateRelativeScore(COURSE_DATA, scores)).toBe(-1);
  });

  it('returns 0 for empty scores object', () => {
    expect(calculateRelativeScore(COURSE_DATA, {})).toBe(0);
  });

  it('calculates full 18 hole round relative score correctly', () => {
    const scores: Record<number, HoleScore> = {};
    COURSE_DATA.forEach(hole => {
      // Play 1 over par on odd holes, par on even holes
      const extra = hole.number % 2 !== 0 ? 1 : 0;
      scores[hole.number] = { holeNumber: hole.number, approachShots: hole.par + extra - 1, putts: 1 };
    });
    // 9 odd holes -> +9
    expect(calculateRelativeScore(COURSE_DATA, scores)).toBe(9);
  });

  it('excludes the active hole when excludeHoleNumber is provided', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 3, putts: 2 }, // Hole 1 (Par 4, 5 shots -> +1)
      2: { holeNumber: 2, approachShots: 1, putts: 0 }, // Hole 2 in progress (Par 4, 1 shot)
    };
    // Exclude Hole 2 (active hole): only Hole 1 counts -> +1
    expect(calculateRelativeScore(COURSE_DATA, scores, 2)).toBe(1);
    // Exclude Hole 1: only Hole 2 counts -> 1 - 4 = -3
    expect(calculateRelativeScore(COURSE_DATA, scores, 1)).toBe(-3);
  });

  it('returns 0 for Hole 1 in progress when excluding Hole 1', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 1, putts: 0 }, // 1 shot on Hole 1
    };
    expect(calculateRelativeScore(COURSE_DATA, scores, 1)).toBe(0);
  });
});

describe('calculateScoreDistribution', () => {
  it('returns empty distribution for empty scores', () => {
    const dist = calculateScoreDistribution(COURSE_DATA, {});
    expect(dist).toEqual({
      eaglesOrBetter: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 0,
      tripleBogeys: 0,
      otherBogeys: 0,
    });
  });

  it('correctly categorizes eagle, birdie, par, bogey, double, triple, and other', () => {
    // Holes: 1(P4), 2(P4), 3(P3), 4(P5), 5(P4), 6(P3), 7(P5)
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 1, putts: 1 }, // Par 4, score 2 (-2: Eagle)
      2: { holeNumber: 2, approachShots: 2, putts: 1 }, // Par 4, score 3 (-1: Birdie)
      3: { holeNumber: 3, approachShots: 2, putts: 1 }, // Par 3, score 3 (0: Par)
      4: { holeNumber: 4, approachShots: 4, putts: 2 }, // Par 5, score 6 (+1: Bogey)
      5: { holeNumber: 5, approachShots: 4, putts: 2 }, // Par 4, score 6 (+2: Double)
      6: { holeNumber: 6, approachShots: 5, putts: 1 }, // Par 3, score 6 (+3: Triple)
      7: { holeNumber: 7, approachShots: 7, putts: 3 }, // Par 5, score 10 (+5: Other)
    };

    const dist = calculateScoreDistribution(COURSE_DATA, scores);
    expect(dist).toEqual({
      eaglesOrBetter: 1,
      birdies: 1,
      pars: 1,
      bogeys: 1,
      doubleBogeys: 1,
      tripleBogeys: 1,
      otherBogeys: 1,
    });
  });

  it('excludes active hole from score distribution when excludeHoleNumber is passed', () => {
    const scores: Record<number, HoleScore> = {
      1: { holeNumber: 1, approachShots: 2, putts: 1 }, // Par 4, score 3 (Birdie)
      2: { holeNumber: 2, approachShots: 2, putts: 1 }, // Par 4, score 3 (Birdie)
      3: { holeNumber: 3, approachShots: 1, putts: 0 }, // Par 3, 1 shot in progress (would be Eagle if not excluded)
    };

    const dist = calculateScoreDistribution(COURSE_DATA, scores, 3);
    expect(dist.birdies).toBe(2);
    expect(dist.eaglesOrBetter).toBe(0);
  });
});
