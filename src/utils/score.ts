import type { Hole, HoleScore, ScoreDistribution } from '../types';

export const calculateRelativeScore = (course: Hole[], scores: Record<number, HoleScore>): number => {
    let totalShots = 0;
    let totalPar = 0;

    Object.entries(scores).forEach(([holeNumberStr, score]) => {
        const holeNumber = parseInt(holeNumberStr);
        const hole = course.find(h => h.number === holeNumber);

        // Only count holes that have at least one shot OR are the current hole with shots
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
    scores: Record<number, HoleScore>
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
        const holeNumber = parseInt(holeNumberStr);
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

