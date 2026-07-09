import React, { useState } from 'react';
import type { Hole, HoleScore } from '../types';
import { ArrowLeft, ChevronDown, ChevronUp, Menu } from 'lucide-react';
import { APP_VERSION } from '../constants/version';
import { calculateRelativeScore, calculateScoreDistribution } from '../utils/score';


interface ScorecardProps {
    course: Hole[];
    scores: Record<number, HoleScore>;
    onBack: () => void;
    onMenuClick: () => void;
}

export const Scorecard: React.FC<ScorecardProps> = ({ course, scores, onBack, onMenuClick }) => {
    const [expandedHole, setExpandedHole] = useState<number | null>(null);

    const totalShots = Object.values(scores).reduce((acc, score) => acc + score.approachShots + score.putts, 0);
    const playedHoles = course.filter(hole => scores[hole.number] && (scores[hole.number].approachShots + scores[hole.number].putts > 0));
    const totalPar = playedHoles.reduce((acc, hole) => acc + hole.par, 0);
    const relativeScore = calculateRelativeScore(course, scores);
    const scoreDistribution = calculateScoreDistribution(course, scores);

    const statItems = [
        { label: 'Eagles/Mejor', count: scoreDistribution.eaglesOrBetter, colorClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' },
        { label: 'Birdies', count: scoreDistribution.birdies, colorClass: 'bg-rose-500', textClass: 'text-rose-600 dark:text-rose-400' },
        { label: 'Pares', count: scoreDistribution.pars, colorClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Bogeys', count: scoreDistribution.bogeys, colorClass: 'bg-slate-400', textClass: 'text-slate-600 dark:text-slate-400' },
        { label: 'Doble Bogeys', count: scoreDistribution.doubleBogeys, colorClass: 'bg-indigo-500', textClass: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Triple Bogeys', count: scoreDistribution.tripleBogeys, colorClass: 'bg-amber-800', textClass: 'text-amber-800 dark:text-amber-600' },
        { label: 'Otros Bogeys', count: scoreDistribution.otherBogeys, colorClass: 'bg-zinc-600', textClass: 'text-zinc-600 dark:text-zinc-400' },
    ];


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

    const toggleHole = (holeNumber: number) => {
        setExpandedHole(expandedHole === holeNumber ? null : holeNumber);
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
                <button
                    onClick={onMenuClick}
                    className="p-3 theme-btn-primary rounded-lg shadow-sm"
                >
                    <Menu size={24} />
                </button>
                {/* Version indicator */}
                <span className="absolute top-2 right-2 text-[10px] theme-text-tertiary font-mono">
                    v{APP_VERSION}
                </span>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="mb-6 p-4 theme-card-approach rounded-lg border-2">
                    <div className="flex justify-around items-center">
                        <div className="text-center">
                            <div className="text-sm theme-text-approach uppercase tracking-wide font-semibold">Total</div>
                            <div className="text-4xl font-black theme-text-approach">{totalShots}</div>
                            <div className="text-xs theme-text-approach opacity-75">Par {totalPar}</div>
                        </div>
                        <div className="w-px h-12 bg-blue-200 opacity-50"></div>
                        <div className="text-center">
                            <div className="text-sm theme-text-approach uppercase tracking-wide font-semibold">To Par</div>
                            <div className={`text-4xl font-black ${relativeScore === 0 ? 'theme-text-accent-blue' : relativeScore < 0 ? 'theme-text-accent-red' : 'theme-text-primary'
                                }`}>
                                {relativeScore > 0 ? `+${relativeScore}` : relativeScore === 0 ? 'E' : relativeScore}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel de Estadísticas */}
                {playedHoles.length > 0 && (
                    <div className="mb-6 p-4 theme-card rounded-lg border-2 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                            Distribución de Scores
                        </h3>

                        {/* Barra de distribución horizontal segmentada */}
                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex mb-4 shadow-inner">
                            {statItems.map((item, idx) => {
                                const percentage = (item.count / playedHoles.length) * 100;
                                if (percentage === 0) return null;
                                return (
                                    <div
                                        key={idx}
                                        style={{ width: `${percentage}%` }}
                                        className={`${item.colorClass} h-full transition-all duration-300`}
                                        title={`${item.label}: ${item.count} (${Math.round(percentage)}%)`}
                                    />
                                );
                            })}
                        </div>

                        {/* Detalle en Cuadrícula (Grid) */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {statItems.map((item, idx) => {
                                const isZero = item.count === 0;
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded-xl border theme-border transition-all duration-200 ${
                                            isZero
                                                ? 'opacity-40 theme-bg-secondary'
                                                : 'theme-bg-primary hover:scale-[1.02] shadow-sm hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.colorClass}`} />
                                            <span className="text-xs font-semibold theme-text-secondary truncate">{item.label}</span>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${isZero ? 'theme-text-tertiary' : item.textClass}`}>
                                            {item.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {course.map((hole) => {
                        const score = scores[hole.number];
                        const { total, display } = getScoreForHole(hole.number);
                        const isExpanded = expandedHole === hole.number;

                        return (
                            <div key={hole.number} className="theme-card rounded-lg shadow-sm border theme-border overflow-hidden">
                                {/* Main Row - Clickable to expand */}
                                <div
                                    className="flex items-center justify-between p-3 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
                                    onClick={() => toggleHole(hole.number)}
                                >
                                    {/* Left: Hole Info */}
                                    <div className="flex flex-col w-20 shrink-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm theme-text-primary font-bold uppercase">Hole {hole.number}</span>
                                            {isExpanded ? <ChevronUp size={14} className="theme-text-tertiary" /> : <ChevronDown size={14} className="theme-text-tertiary" />}
                                        </div>
                                        <span className="text-[10px] theme-text-tertiary font-semibold uppercase tracking-wider">
                                            Par {hole.par} • {hole.distance}y
                                        </span>
                                    </div>

                                    {/* Center: Details (Strokes breakdown) */}
                                    <div className="flex-1 px-3 flex flex-col justify-center border-l theme-border ml-2 pl-3">
                                        {score ? (
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
                                        ) : (
                                            <span className="text-xs theme-text-tertiary italic">-</span>
                                        )}
                                    </div>

                                    {/* Right: Total Score */}
                                    <div className={`text-2xl font-mono font-bold w-12 text-center shrink-0 ${getScoreColor(hole.par, total)}`}>
                                        {display}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && score && (
                                    <div className="theme-bg-secondary border-t theme-border p-3 text-sm animate-in slide-in-from-top-2 duration-200">

                                        {/* Shot Details Table */}
                                        {score.approachShotsDetails && score.approachShotsDetails.length > 0 ? (
                                            <div>
                                                <div className="grid grid-cols-3 text-[10px] font-bold uppercase theme-text-tertiary mb-2 px-2">
                                                    <span>Club</span>
                                                    <span className="text-center">Distance</span>
                                                    <span className="text-right">Time</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {score.approachShotsDetails.map((shot, idx) => (
                                                        <div key={idx} className="grid grid-cols-3 items-center p-2 rounded-md theme-bg-primary theme-border border">
                                                            <span className="font-bold theme-text-primary">{shot.club}</span>
                                                            <span className="text-center theme-text-secondary font-mono">
                                                                {shot.distance ? `${shot.distance}y` : '-'}
                                                            </span>
                                                            <span className="text-right theme-text-tertiary text-[10px]">
                                                                {new Date(shot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-xs theme-text-tertiary py-2 italic">
                                                No shot details recorded
                                            </div>
                                        )}

                                        {/* Tee Info */}
                                        {score.teeLocation && (
                                            <div className="mt-3 pt-2 border-t theme-border flex justify-between text-[10px] theme-text-tertiary">
                                                <span>Tee Location Set</span>
                                                <span className="font-mono">
                                                    {score.teeLocation.latitude.toFixed(5)}, {score.teeLocation.longitude.toFixed(5)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
