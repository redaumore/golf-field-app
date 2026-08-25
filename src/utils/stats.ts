import type { Hole, HoleScore, Round, ShotDetail } from '../types';
import { getCourseById } from '../data/course';

export interface ClubDistance {
    club: string;
    distance: number;
}

function getCourseForRound(round: Round, fallbackCourse?: Hole[]): Hole[] {
    if (round.courseId) {
        return getCourseById(round.courseId).holes;
    }
    return fallbackCourse || getCourseById().holes;
}

// Max acceptable GPS accuracy (meters) for a shot's distance to be trusted in
// club distance stats. Worse fixes (e.g. ~98 m) produce absurd distances.
export const MAX_DISTANCE_ACCURACY = 20;

// A shot is eligible for distance stats only when its location accuracy is a
// known value within the threshold. Shots with no accuracy (legacy rounds) are
// excluded — their distance measurement can't be trusted.
function hasUsableAccuracy(shot: ShotDetail): boolean {
    const accuracy = shot.location?.accuracy;
    return accuracy != null && accuracy <= MAX_DISTANCE_ACCURACY;
}

// Plausible upper bound for a single golf shot, in yards. Anything above is a
// bad measurement (bogus GPS distance) and is excluded from club distance stats.
export const MAX_CLUB_DISTANCE = 290;

// A shot counts toward club distance stats only when all of these hold:
// a real club (not LostBall), marked STATS, has a distance, within the plausible
// max, and its GPS accuracy is known and within threshold.
function isDistanceStatShot(shot: ShotDetail): shot is ShotDetail & { distance: number } {
    if (shot.club === 'LostBall') return false;
    if (shot.isRepresentative !== true) return false;
    if (shot.distance == null) return false;
    if (shot.distance > MAX_CLUB_DISTANCE) return false;
    return hasUsableAccuracy(shot);
}

// Count shots recorded with the 'LostBall' club across all holes.
export function countLostBalls(scores: Record<number, HoleScore>): number {
    let count = 0;

    Object.values(scores).forEach(score => {
        const details = score.approachShotsDetails || [];
        details.forEach(shot => {
            if (shot.club === 'LostBall') {
                count++;
            }
        });
    });

    return count;
}

// Max distance per club (yards, rounded), counting only shots marked as representative
// (STATS) and excluding 'LostBall' and shots with no distance.
export function maxDistanceByClub(scores: Record<number, HoleScore>): ClubDistance[] {
    const maxByClub = new Map<string, number>();

    Object.values(scores).forEach(score => {
        const details = score.approachShotsDetails || [];
        details.forEach(shot => {
            if (!isDistanceStatShot(shot)) return;

            const current = maxByClub.get(shot.club);
            if (current === undefined || shot.distance > current) {
                maxByClub.set(shot.club, shot.distance);
            }
        });
    });

    return Array.from(maxByClub.entries())
        .map(([club, distance]) => ({ club, distance: Math.round(distance) }))
        .sort((a, b) => b.distance - a.distance);
}

// Most recent `window` rounds, newest first.
function recentRounds(rounds: Round[], window: number): Round[] {
    return [...rounds]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, window);
}

// ==== WHS (World Handicap System) estimated handicap ====

// Golf defaults used when course ratings are not stored in the app.
export const WHS_SLOPE_DEFAULT = 113;
export const WHS_PCC_DEFAULT = 0;
export const WHS_MAX_ROUNDS = 20;

export interface HandicapRoundDetail {
    id: string;
    date: Date;
    grossScore: number;
    adjustedGrossScore: number;
    differential: number;
    usedInIndex: boolean;
}

export interface HandicapBreakdown {
    handicap: number | null;
    rounds: HandicapRoundDetail[];
    usedCount: number;
    averageDifferential: number | null;
    adjustment: number;
}

export interface HandicapCalculationOptions {
    courseRating?: number;   // default: course par
    slopeRating?: number;    // default: 113
    pcc?: number;            // default: 0
    maxRounds?: number;      // default: 20
}

// Sum of pars for all holes (used as the default Course Rating).
export function coursePar(course: Hole[]): number {
    return course.reduce((sum, hole) => sum + hole.par, 0);
}

// Net double bogey: par + 2 + handicap strokes. With no established handicap
// index, handicap strokes default to 0 (scratch), so the cap is par + 2.
function netDoubleBogey(hole: Hole): number {
    return hole.par + 2;
}

// Raw gross score (sum of all strokes) for a round.
function grossScore(round: Round): number {
    return Object.values(round.scores).reduce(
        (sum, score) => sum + score.approachShots + score.putts,
        0
    );
}

// Adjusted Gross Score: per-hole score capped at net double bogey (par + 2).
export function adjustedGrossScore(round: Round, course?: Hole[]): number {
    const courseHoles = getCourseForRound(round, course);
    let ags = 0;
    Object.values(round.scores).forEach(score => {
        const hole = courseHoles.find(h => h.number === score.holeNumber);
        const total = score.approachShots + score.putts;
        if (total > 0 && hole) {
            ags += Math.min(total, netDoubleBogey(hole));
        }
    });
    return ags;
}

// Score differential (WHS): (AGS - Course Rating - PCC) * 113 / Slope Rating.
export function scoreDifferential(
    ags: number,
    courseRating: number,
    slopeRating: number = WHS_SLOPE_DEFAULT,
    pcc: number = WHS_PCC_DEFAULT
): number {
    return ((ags - courseRating - pcc) * 113) / slopeRating;
}

// WHS: how many of the best differentials to average, and the adjustment to
// subtract, based on the number of available differentials.
function differentialsToUse(count: number): { use: number; adjustment: number } {
    if (count >= 20) return { use: 8, adjustment: 0 };
    if (count >= 19) return { use: 7, adjustment: 0 };
    if (count >= 17) return { use: 6, adjustment: 0 };
    if (count >= 15) return { use: 5, adjustment: 0 };
    if (count >= 12) return { use: 4, adjustment: 0 };
    if (count >= 9) return { use: 3, adjustment: 0 };
    if (count >= 7) return { use: 2, adjustment: 0 };
    if (count === 6) return { use: 2, adjustment: 1 };
    if (count === 5) return { use: 1, adjustment: 0 };
    if (count === 4) return { use: 1, adjustment: 1 };
    if (count === 3) return { use: 1, adjustment: 2 };
    return { use: 0, adjustment: 0 };
}

function roundToDecimal(value: number, decimals = 1): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

// A round is a complete 18-hole round when all 18 holes have recorded shots.
function isCompleteRound(round: Round, course?: Hole[]): boolean {
    const courseHoles = getCourseForRound(round, course);
    return courseHoles.every(hole => {
        const score = round.scores[hole.number];
        const holeTotal = score ? score.approachShots + score.putts : 0;
        return holeTotal > 0;
    });
}

export function calculateHandicapBreakdown(
    rounds: Round[],
    course?: Hole[],
    options: HandicapCalculationOptions = {}
): HandicapBreakdown {
    const complete = rounds.filter(r => isCompleteRound(r, course));
    const slopeRating = options.slopeRating ?? WHS_SLOPE_DEFAULT;
    const pcc = options.pcc ?? WHS_PCC_DEFAULT;
    const maxRounds = options.maxRounds ?? WHS_MAX_ROUNDS;

    const recent = recentRounds(complete, maxRounds);

    const details: HandicapRoundDetail[] = recent.map(round => {
        const courseHoles = getCourseForRound(round, course);
        const ags = adjustedGrossScore(round, courseHoles);
        const roundCourseRating = options.courseRating ?? coursePar(courseHoles);
        return {
            id: round.id,
            date: round.date,
            grossScore: grossScore(round),
            adjustedGrossScore: ags,
            differential: roundToDecimal(scoreDifferential(ags, roundCourseRating, slopeRating, pcc)),
            usedInIndex: false,
        };
    });

    const { use, adjustment } = differentialsToUse(details.length);

    if (use === 0) {
        return {
            handicap: null,
            rounds: details,
            usedCount: 0,
            averageDifferential: null,
            adjustment: 0,
        };
    }

    const bestAsc = [...details]
        .sort((a, b) => a.differential - b.differential)
        .slice(0, use);
    const usedIds = new Set(bestAsc.map(d => d.id));
    const markedRounds = details.map(d => ({ ...d, usedInIndex: usedIds.has(d.id) }));

    const average = bestAsc.reduce((acc, d) => acc + d.differential, 0) / bestAsc.length;
    const handicap = roundToDecimal(average - adjustment);

    return {
        handicap,
        rounds: markedRounds,
        usedCount: use,
        averageDifferential: roundToDecimal(average),
        adjustment,
    };
}

export function calculateEstimatedHandicap(
    rounds: Round[],
    course?: Hole[],
    options: HandicapCalculationOptions = {}
): number | null {
    return calculateHandicapBreakdown(rounds, course, options).handicap;
}

// ==== P-06 / P-07: cross-round aggregates for the player profile ====

export const LOST_BALLS_WINDOW = 5;
export const MAX_DISTANCE_WINDOW = 10;

export interface LostBallsAverage {
    average: number;
    roundsConsidered: number;
    totalLostBalls: number;
}

// P-06: average lost balls per round over the last `window` rounds.
// Only finished rounds that completed all 18 holes are considered.
export function averageLostBalls(
    rounds: Round[],
    course?: Hole[],
    window: number = LOST_BALLS_WINDOW
): LostBallsAverage | null {
    const eligible = rounds.filter(round => round.isFinished && isCompleteRound(round, course));
    const recent = recentRounds(eligible, window);
    if (recent.length === 0) return null;

    const totalLostBalls = recent.reduce(
        (sum, round) => sum + countLostBalls(round.scores),
        0
    );

    return {
        average: roundToDecimal(totalLostBalls / recent.length),
        roundsConsidered: recent.length,
        totalLostBalls,
    };
}

// A single club's best distance plus the round date and hole where it was hit.
export interface HistoricalClubDistance {
    club: string;
    distance: number;
    date: Date;
    holeNumber: number;
}

// P-07: best (max) distance per club across the last `window` rounds, with the
// round date and hole where each max was recorded. Only finished rounds that
// completed all 18 holes are considered.
export function historicalMaxDistanceByClub(
    rounds: Round[],
    course?: Hole[],
    window: number = MAX_DISTANCE_WINDOW
): HistoricalClubDistance[] {
    const eligible = rounds.filter(round => round.isFinished && isCompleteRound(round, course));
    const recent = recentRounds(eligible, window);

    // club -> best shot so far (raw distance for comparison, date + hole for display).
    const best = new Map<string, { club: string; raw: number; date: Date; holeNumber: number }>();

    recent.forEach(round => {
        Object.values(round.scores).forEach(score => {
            (score.approachShotsDetails || []).forEach(shot => {
                if (!isDistanceStatShot(shot)) return;

                const current = best.get(shot.club);
                if (current === undefined || shot.distance > current.raw) {
                    best.set(shot.club, {
                        club: shot.club,
                        raw: shot.distance,
                        date: round.date,
                        holeNumber: score.holeNumber,
                    });
                }
            });
        });
    });

    return Array.from(best.values())
        .map(({ club, raw, date, holeNumber }) => ({
            club,
            distance: Math.round(raw),
            date,
            holeNumber,
        }))
        .sort((a, b) => b.distance - a.distance);
}
