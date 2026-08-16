import { describe, it, expect } from 'vitest';
import { countLostBalls, maxDistanceByClub, calculateEstimatedHandicap, calculateHandicapBreakdown, scoreDifferential, adjustedGrossScore } from '../stats';
import { COURSE_DATA } from '../../data/course';
import type { HoleScore, Round, ShotDetail } from '../../types';

const makeShot = (club: ShotDetail['club'], distance?: number, isRepresentative = true): ShotDetail => ({
    club,
    distance,
    timestamp: Date.now(),
    isRepresentative,
});

const makeRound = (id: string, date: Date, scores: Record<number, HoleScore>, isFinished = true): Round => ({
    id,
    date,
    scores,
    currentHoleIndex: 0,
    isFinished,
});

const atParScores = (): Record<number, HoleScore> => {
    const scores: Record<number, HoleScore> = {};
    COURSE_DATA.forEach(hole => {
        scores[hole.number] = { holeNumber: hole.number, approachShots: hole.par - 1, putts: 1 };
    });
    return scores;
};

// Build a full 18-hole round `over` strokes over par, distributing +1 across the
// first `over` holes (so no hole exceeds net double bogey).
const overParRound = (id: string, date: Date, over: number): Round => {
    const scores = atParScores();
    let remaining = over;
    for (const hole of COURSE_DATA) {
        if (remaining <= 0) break;
        scores[hole.number] = { ...scores[hole.number], approachShots: scores[hole.number].approachShots + 1 };
        remaining--;
    }
    return makeRound(id, date, scores);
};

describe('countLostBalls', () => {
  it('returns 0 for empty scores', () => {
    expect(countLostBalls({})).toBe(0);
  });

  it('counts LostBall shots across multiple holes and ignores other clubs', () => {
    const scores: Record<number, HoleScore> = {
      1: {
        holeNumber: 1,
        approachShots: 3,
        putts: 2,
        approachShotsDetails: [
          makeShot('7i', 140),
          makeShot('LostBall'),
        ],
      },
      2: {
        holeNumber: 2,
        approachShots: 2,
        putts: 1,
        approachShotsDetails: [
          makeShot('LostBall'),
          makeShot('Pw', 90),
          makeShot('LostBall'),
        ],
      },
    };
    expect(countLostBalls(scores)).toBe(3);
  });
});

describe('maxDistanceByClub', () => {
  it('returns empty for empty scores', () => {
    expect(maxDistanceByClub({})).toEqual([]);
  });

  it('returns per-club max distance, excluding LostBall and missing distances', () => {
    const scores: Record<number, HoleScore> = {
      1: {
        holeNumber: 1,
        approachShots: 4,
        putts: 2,
        approachShotsDetails: [
          makeShot('7i', 120),
          makeShot('7i', 150), // max for 7i
          makeShot('LostBall'),
          makeShot('Pw', 80),
          makeShot('3w'), // no distance -> excluded
        ],
      },
      2: {
        holeNumber: 2,
        approachShots: 2,
        putts: 1,
        approachShotsDetails: [
          makeShot('3w', 210),
        ],
      },
    };

    const result = maxDistanceByClub(scores);
    expect(result).toEqual([
      { club: '3w', distance: 210 },
      { club: '7i', distance: 150 },
      { club: 'Pw', distance: 80 },
    ]);
  });

  it('sorts descending by distance', () => {
    const scores: Record<number, HoleScore> = {
      1: {
        holeNumber: 1,
        approachShots: 3,
        putts: 2,
        approachShotsDetails: [
          makeShot('Pw', 70),
          makeShot('3w', 200),
          makeShot('7i', 130),
        ],
      },
    };

    const result = maxDistanceByClub(scores);
    expect(result.map(r => r.club)).toEqual(['3w', '7i', 'Pw']);
  });

  it('only includes shots marked as representative (STATS)', () => {
    const scores: Record<number, HoleScore> = {
      1: {
        holeNumber: 1,
        approachShots: 4,
        putts: 2,
        approachShotsDetails: [
          makeShot('7i', 150, true),
          makeShot('7i', 200, false),
          { club: 'Pw', distance: 90, timestamp: Date.now() },
        ],
      },
    };

    expect(maxDistanceByClub(scores)).toEqual([{ club: '7i', distance: 150 }]);
  });
});

describe('scoreDifferential', () => {
  it('defaults to slope 113 and pcc 0, so differential = ags - course rating', () => {
    expect(scoreDifferential(84, 72)).toBeCloseTo(12, 5);
  });

  it('scales by slope rating', () => {
    expect(scoreDifferential(84, 72, 120)).toBeCloseTo(11.3, 5);
  });

  it('subtracts PCC', () => {
    expect(scoreDifferential(84, 72, 113, 2)).toBeCloseTo(10, 5);
  });
});

describe('adjustedGrossScore', () => {
  it('caps a blow-up hole at net double bogey (par + 2)', () => {
    const scores = atParScores();
    scores[1] = { holeNumber: 1, approachShots: 10, putts: 2 }; // 12 on par 4 -> capped to 6
    const round = makeRound('1', new Date('2026-01-01'), scores);
    expect(adjustedGrossScore(round, COURSE_DATA)).toBe(75); // 6 + 69
  });

  it('leaves scores under the cap untouched', () => {
    const round = overParRound('1', new Date('2026-01-01'), 3);
    expect(adjustedGrossScore(round, COURSE_DATA)).toBe(76); // 73 + 3
  });
});

describe('calculateEstimatedHandicap', () => {
  it('returns null when there are fewer than 3 complete 18-hole rounds', () => {
    expect(calculateEstimatedHandicap([], COURSE_DATA)).toBeNull();
    expect(calculateEstimatedHandicap([overParRound('1', new Date('2026-01-01'), 5)], COURSE_DATA)).toBeNull();
  });

  it('uses the best differential and applies the WHS adjustment for 3 rounds', () => {
    const rounds = [
      overParRound('r1', new Date('2026-01-01'), 14),
      overParRound('r2', new Date('2026-02-01'), 12),
      overParRound('r3', new Date('2026-03-01'), 10),
    ];
    // 3 rounds -> best 1, adjustment -2.0: 10 - 2 = 8
    expect(calculateEstimatedHandicap(rounds, COURSE_DATA)).toBe(8);
  });

  it('averages the best 8 of the last 20 differentials', () => {
    const rounds = Array.from({ length: 20 }, (_, i) =>
      overParRound(`r${i + 1}`, new Date(2026, 0, i + 1), i + 1)
    );
    // best 8: differentials 1..8 -> average 4.5
    expect(calculateEstimatedHandicap(rounds, COURSE_DATA)).toBe(4.5);
  });
});

describe('calculateHandicapBreakdown', () => {
  it('returns null handicap and empty rounds when there are no 18-hole rounds', () => {
    const result = calculateHandicapBreakdown([], COURSE_DATA);
    expect(result.handicap).toBeNull();
    expect(result.rounds).toEqual([]);
    expect(result.usedCount).toBe(0);
    expect(result.adjustment).toBe(0);
    expect(result.averageDifferential).toBeNull();
  });

  it('returns rounds newest-first and flags the ones used in the index', () => {
    const rounds = [
      overParRound('r1', new Date('2026-01-01'), 14),
      overParRound('r2', new Date('2026-02-01'), 12),
      overParRound('r3', new Date('2026-03-01'), 10),
    ];
    const result = calculateHandicapBreakdown(rounds, COURSE_DATA);

    expect(result.handicap).toBe(8);
    expect(result.usedCount).toBe(1);
    expect(result.adjustment).toBe(2);
    expect(result.averageDifferential).toBe(10);
    expect(result.rounds.map(r => r.id)).toEqual(['r3', 'r2', 'r1']);
    expect(result.rounds.filter(r => r.usedInIndex).map(r => r.id)).toEqual(['r3']);
  });

  it('caps blow-up holes when computing the adjusted gross score', () => {
    const scores = atParScores();
    scores[1] = { holeNumber: 1, approachShots: 10, putts: 2 }; // 12 -> capped to 6
    const blowup = makeRound('blow', new Date('2026-01-01'), scores);
    const rounds = [
      blowup,
      overParRound('p2', new Date('2026-02-01'), 10),
      overParRound('p3', new Date('2026-03-01'), 12),
    ];
    const result = calculateHandicapBreakdown(rounds, COURSE_DATA);
    const blow = result.rounds.find(r => r.id === 'blow')!;

    expect(blow.grossScore).toBe(81); // 12 + 69
    expect(blow.adjustedGrossScore).toBe(75); // 6 + 69
    expect(blow.differential).toBe(2); // 75 - 73
  });

  it('wrapper agrees with the breakdown', () => {
    const rounds = [
      overParRound('a', new Date('2026-01-01'), 8),
      overParRound('b', new Date('2026-02-01'), 9),
      overParRound('c', new Date('2026-03-01'), 10),
    ];
    const result = calculateHandicapBreakdown(rounds, COURSE_DATA);
    expect(result.handicap).toBe(6); // best 1 (8) - 2 = 6
    expect(calculateEstimatedHandicap(rounds, COURSE_DATA)).toBe(result.handicap);
  });

  it('excludes finished rounds with fewer than 18 holes', () => {
    const partialScores: Record<number, HoleScore> = {};
    COURSE_DATA.slice(0, 9).forEach(hole => {
      partialScores[hole.number] = { holeNumber: hole.number, approachShots: hole.par - 1, putts: 1 };
    });
    const partial = makeRound('partial', new Date('2026-01-01'), partialScores, true);
    const rounds = [
      partial,
      overParRound('a', new Date('2026-02-01'), 10),
      overParRound('b', new Date('2026-03-01'), 12),
    ];
    const result = calculateHandicapBreakdown(rounds, COURSE_DATA);

    // the 9-hole round is ignored; only 2 complete rounds remain -> no index yet
    expect(result.rounds.map(r => r.id)).toEqual(['b', 'a']);
    expect(result.handicap).toBeNull();
    expect(result.usedCount).toBe(0);
  });

  it('includes a complete 18-hole round even when not manually finished', () => {
    const notFinished = { ...overParRound('a', new Date('2026-01-01'), 8), isFinished: false };
    const rounds = [
      notFinished,
      overParRound('b', new Date('2026-02-01'), 9),
      overParRound('c', new Date('2026-03-01'), 10),
    ];
    const result = calculateHandicapBreakdown(rounds, COURSE_DATA);

    expect(result.rounds).toHaveLength(3);
    expect(result.rounds.map(r => r.id)).toEqual(['c', 'b', 'a']);
    expect(result.handicap).toBe(6); // best 1 (8) - 2 = 6
  });
});
