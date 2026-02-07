import type { Hole, HoleScore } from '../types';

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
