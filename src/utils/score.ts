import type { Hole, HoleScore, GuestScore, ScoreDistribution } from '../types';

type ScoreRecord = Record<number, HoleScore | GuestScore | { approachShots: number; putts: number }>;

/**
 * Normalizes approach and putt counts for a hole score.
 * If details exist and putts === 0 but 'Pt' (putter) shots were recorded in details,
 * accurately derives the approach and putt counts from the shot details.
 */
export const getHoleBreakdown = (score?: HoleScore | GuestScore | { approachShots: number; putts: number; approachShotsDetails?: HoleScore['approachShotsDetails'] }): { approachShots: number; putts: number } => {
    if (!score) return { approachShots: 0, putts: 0 };
    const details = 'approachShotsDetails' in score ? score.approachShotsDetails : undefined;
    if (details && details.length > 0 && score.putts === 0) {
        const puttsCount = details.filter(s => s.club === 'Pt').length;
        if (puttsCount > 0) {
            const approachCount = details.filter(s => s.club !== 'Pt').length;
            return {
                approachShots: approachCount,
                putts: puttsCount,
            };
        }
    }
    return {
        approachShots: score.approachShots || 0,
        putts: score.putts || 0,
    };
};

export const calculateRelativeScore = (
    course: Hole[],
    scores: ScoreRecord,
    excludeHoleNumber?: number
): number => {
    let totalShots = 0;
    let totalPar = 0;

    Object.entries(scores).forEach(([holeNumberStr, score]) => {
        const holeNumber = parseInt(holeNumberStr, 10);
        if (excludeHoleNumber !== undefined && holeNumber === excludeHoleNumber) {
            return;
        }

        const hole = course.find(h => h.number === holeNumber);

        // Only count holes that have at least one shot
        const holeTotal = score.approachShots + score.putts;
        if (holeTotal > 0 && hole) {
            totalShots += holeTotal;
            totalPar += hole.par;
        }
    });

    return totalShots - totalPar;
};

export const calculateScoreDistribution = (
    course: Hole[],
    scores: ScoreRecord,
    excludeHoleNumber?: number
): ScoreDistribution => {
    const dist: ScoreDistribution = {
        eaglesOrBetter: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        tripleBogeys: 0,
        otherBogeys: 0,
    };

    Object.entries(scores).forEach(([holeNumberStr, score]) => {
        const holeNumber = parseInt(holeNumberStr, 10);
        if (excludeHoleNumber !== undefined && holeNumber === excludeHoleNumber) {
            return;
        }

        const hole = course.find(h => h.number === holeNumber);
        const holeTotal = score.approachShots + score.putts;

        // Only count holes that have been played (i.e. shots > 0)
        if (holeTotal > 0 && hole) {
            const diff = holeTotal - hole.par;
            if (diff <= -2) {
                dist.eaglesOrBetter++;
            } else if (diff === -1) {
                dist.birdies++;
            } else if (diff === 0) {
                dist.pars++;
            } else if (diff === 1) {
                dist.bogeys++;
            } else if (diff === 2) {
                dist.doubleBogeys++;
            } else if (diff === 3) {
                dist.tripleBogeys++;
            } else if (diff > 3) {
                dist.otherBogeys++;
            }
        }
    });

    return dist;
};


