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
        if (score === 0) return 'text-gray-500';
        const diff = score - par;
        if (diff <= -2) return 'text-gold-600 font-bold'; // Eagle or better
        if (diff === -1) return 'text-red-600 font-bold'; // Birdie
        if (diff === 0) return 'text-blue-600 font-bold'; // Par
        if (diff === 1) return 'text-black'; // Bogey
        return 'text-black'; // Double Bogey+
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-black">
            <div className="relative p-4 bg-gray-100 border-b border-gray-300 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 mr-4 bg-white border border-gray-300 rounded-full shadow-sm active:bg-gray-200">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold">Scorecard</h1>
                </div>
                <ThemeToggle />
                {/* Version indicator */}
                <span className="absolute top-2 right-2 text-[10px] text-gray-400 font-mono">
                    v{APP_VERSION}
                </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold">Total Score</div>
                    <div className="text-4xl font-black text-blue-900">{totalShots}</div>
                    <div className="text-sm text-gray-500 mt-1">Par {totalPar}</div>
                </div>

                <div className="space-y-2">
                    {course.map((hole) => {
                        const { total, display } = getScoreForHole(hole.number);
                        return (
                            <div key={hole.number} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Hole {hole.number}</span>
                                    <span className="text-xs text-gray-400">Par {hole.par} • {hole.distance}y</span>
                                </div>
                                <div className={`text-2xl font-mono ${getScoreColor(hole.par, total)}`}>
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
