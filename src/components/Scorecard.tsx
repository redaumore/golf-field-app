import React from 'react';
import type { Hole, HoleScore } from '../types';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { APP_VERSION } from '../constants/version';

interface ScorecardProps {
    course: Hole[];
    scores: Record<number, HoleScore>;
    onBack: () => void;
}

export const Scorecard: React.FC<ScorecardProps> = ({ course, scores, onBack }) => {
    const totalShots = Object.values(scores).reduce((acc, score) => acc + score.approachShots + score.putts, 0);
    const totalPar = course.reduce((acc, hole) => acc + hole.par, 0);

    const getScoreForHole = (holeNumber: number) => {
        const score = scores[holeNumber];
        if (!score) return { total: 0, display: '-' };
        return { total: score.approachShots + score.putts, display: (score.approachShots + score.putts).toString() };
    };

    const getScoreColor = (par: number, score: number) => {
        if (score === 0) return 'theme-text-tertiary';
        const diff = score - par;
        if (diff <= -2) return 'theme-text-accent-yellow font-bold'; // Eagle or better
        if (diff === -1) return 'theme-text-accent-red font-bold'; // Birdie
        if (diff === 0) return 'theme-text-accent-blue font-bold'; // Par
        if (diff === 1) return 'theme-text-primary'; // Bogey
        return 'theme-text-primary'; // Double Bogey+
    };

    return (
        <div className="flex flex-col h-screen w-full theme-bg-primary theme-text-primary fixed inset-0">
            {/* Header - Fixed at top */}
            <div className="relative p-4 theme-bg-secondary theme-border border-b flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 mr-4 theme-btn-primary rounded-full shadow-sm">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold">Scorecard</h1>
                </div>
                <ThemeToggle />
                {/* Version indicator */}
                <span className="absolute top-2 right-2 text-[10px] theme-text-tertiary font-mono">
                    v{APP_VERSION}
                </span>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="mb-6 p-4 theme-card-approach rounded-lg text-center border-2">
                    <div className="text-sm theme-text-approach uppercase tracking-wide font-semibold">Total Score</div>
                    <div className="text-4xl font-black theme-text-approach">{totalShots}</div>
                    <div className="text-sm theme-text-approach mt-1 opacity-75">Par {totalPar}</div>
                </div>

                <div className="space-y-3">
                    {course.map((hole) => {
                        const score = scores[hole.number];
                        const { total, display } = getScoreForHole(hole.number);

                        return (
                            <div key={hole.number} className="flex items-center justify-between p-3 theme-card rounded-lg shadow-sm border theme-border">
                                {/* Left: Hole Info */}
                                <div className="flex flex-col w-20 shrink-0">
                                    <span className="text-sm theme-text-primary font-bold uppercase">Hole {hole.number}</span>
                                    <span className="text-[10px] theme-text-tertiary font-semibold uppercase tracking-wider">
                                        Par {hole.par} • {hole.distance}y
                                    </span>
                                </div>

                                {/* Center: Details (Strokes breakdown & Clubs) */}
                                <div className="flex-1 px-3 flex flex-col justify-center border-l theme-border ml-2 pl-3">
                                    {score ? (
                                        <>
                                            <div className="flex gap-3 text-xs font-medium theme-text-secondary">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    App: {score.approachShots}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                    Putts: {score.putts}
                                                </span>
                                            </div>
                                            {score.approachShotsDetails && score.approachShotsDetails.length > 0 && (
                                                <div className="mt-1 text-[11px] theme-text-tertiary truncate">
                                                    <span className="font-semibold opacity-75">Clubs: </span>
                                                    {score.approachShotsDetails.map(d => d.club).join(', ')}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs theme-text-tertiary italic">-</span>
                                    )}
                                </div>

                                {/* Right: Total Score */}
                                <div className={`text-2xl font-mono font-bold w-12 text-center shrink-0 ${getScoreColor(hole.par, total)}`}>
                                    {display}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
