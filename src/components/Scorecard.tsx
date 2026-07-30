import React, { useState } from 'react';
import type { Hole, HoleScore, GuestPlayer } from '../types';
import { ArrowLeft, ChevronDown, ChevronUp, Menu, Users, User } from 'lucide-react';
import { APP_VERSION } from '../constants/version';
import { calculateRelativeScore, calculateScoreDistribution } from '../utils/score';


interface ScorecardProps {
    course: Hole[];
    scores: Record<number, HoleScore>;
    onBack: () => void;
    onMenuClick: () => void;
    guests?: GuestPlayer[];
}

export const Scorecard: React.FC<ScorecardProps> = ({ course, scores, onBack, onMenuClick, guests }) => {
    const [expandedHole, setExpandedHole] = useState<number | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('main');

    const selectedGuest = guests?.find(g => g.id === selectedPlayerId);
    const activeName = selectedPlayerId === 'main' ? 'Jugador Principal' : (selectedGuest?.name || 'Invitado');
    const activeScores = selectedPlayerId === 'main' 
        ? scores 
        : (selectedGuest?.scores || {});

    const totalShots = Object.values(activeScores).reduce((acc, score) => acc + (score?.approachShots || 0) + (score?.putts || 0), 0);
    const playedHoles = course.filter(hole => activeScores[hole.number] && ((activeScores[hole.number].approachShots || 0) + (activeScores[hole.number].putts || 0) > 0));
    const totalPar = playedHoles.reduce((acc, hole) => acc + hole.par, 0);
    const relativeScore = calculateRelativeScore(course, activeScores);
    const scoreDistribution = calculateScoreDistribution(course, activeScores);

    const statItems = [
        { label: 'Eagles/Mejor', count: scoreDistribution.eaglesOrBetter, colorClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' },
        { label: 'Birdies', count: scoreDistribution.birdies, colorClass: 'bg-rose-500', textClass: 'text-rose-600 dark:text-rose-400' },
        { label: 'Pares', count: scoreDistribution.pars, colorClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Bogeys', count: scoreDistribution.bogeys, colorClass: 'bg-slate-400', textClass: 'text-slate-600 dark:text-slate-400' },
        { label: 'Doble Bogeys', count: scoreDistribution.doubleBogeys, colorClass: 'bg-indigo-500', textClass: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Triple Bogeys', count: scoreDistribution.tripleBogeys, colorClass: 'bg-amber-800', textClass: 'text-amber-800 dark:text-amber-600' },
        { label: 'Otros Bogeys', count: scoreDistribution.otherBogeys, colorClass: 'bg-zinc-600', textClass: 'text-zinc-600 dark:text-zinc-400' },
    ];


    const getScoreForHole = (holeNumber: number, targetScores: Record<number, { approachShots: number; putts: number }>) => {
        const score = targetScores[holeNumber];
        if (!score) return { total: 0, display: '-' };
        const holeTotal = score.approachShots + score.putts;
        if (holeTotal === 0) return { total: 0, display: '-' };
        return { total: holeTotal, display: holeTotal.toString() };
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

                {/* Player Selector Tabs when guests exist */}
                {guests && guests.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-bold uppercase tracking-wider mb-2 theme-text-tertiary">
                            Seleccionar Jugador
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setSelectedPlayerId('main')}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                    selectedPlayerId === 'main'
                                        ? 'theme-btn-primary shadow-sm scale-105'
                                        : 'theme-card theme-text-secondary border theme-border hover:opacity-80'
                                }`}
                            >
                                <User size={14} /> Jugador Principal
                            </button>
                            {guests.map(guest => (
                                <button
                                    key={guest.id}
                                    onClick={() => setSelectedPlayerId(guest.id)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                        selectedPlayerId === guest.id
                                            ? 'theme-btn-primary shadow-sm scale-105'
                                            : 'theme-card theme-text-secondary border theme-border hover:opacity-80'
                                    }`}
                                >
                                    <Users size={14} /> {guest.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary Banner for Selected Player */}
                <div className="mb-6 space-y-3">
                    <div className="p-4 theme-card-approach rounded-lg border-2">
                        <div className="text-xs font-bold uppercase tracking-wider mb-2 text-center theme-text-approach flex items-center justify-center gap-1.5">
                            {selectedPlayerId === 'main' ? <User size={14} /> : <Users size={14} />} {activeName}
                        </div>
                        <div className="flex justify-around items-center">
                            <div className="text-center">
                                <div className="text-sm theme-text-approach uppercase tracking-wide font-semibold">Total</div>
                                <div className="text-4xl font-black theme-text-approach">{totalShots}</div>
                                <div className="text-xs theme-text-approach opacity-75">Par {totalPar} ({playedHoles.length} hoyos)</div>
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

                    {/* Quick switch cards for other players */}
                    {guests && guests.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedPlayerId !== 'main' && (
                                <div
                                    onClick={() => setSelectedPlayerId('main')}
                                    className="p-2.5 theme-card rounded-lg border theme-border cursor-pointer hover:border-blue-400 transition-all flex items-center justify-between"
                                >
                                    <div className="text-xs font-bold uppercase theme-text-secondary flex items-center gap-1.5">
                                        <User size={14} /> Jugador Principal
                                    </div>
                                    <div className="text-xs font-semibold theme-text-tertiary">Ver scorecard &rarr;</div>
                                </div>
                            )}
                            {guests.filter(g => g.id !== selectedPlayerId).map((g) => {
                                const gShots = Object.values(g.scores).reduce((acc, s) => acc + s.approachShots + s.putts, 0);
                                const gPlayed = course.filter(h => g.scores[h.number] && (g.scores[h.number].approachShots + g.scores[h.number].putts > 0));
                                const gPar = gPlayed.reduce((acc, h) => acc + h.par, 0);
                                const gRel = gShots - gPar;
                                return (
                                    <div
                                        key={g.id}
                                        onClick={() => setSelectedPlayerId(g.id)}
                                        className="p-2.5 theme-card rounded-lg border theme-border cursor-pointer hover:border-blue-400 transition-all flex items-center justify-between"
                                    >
                                        <div className="text-xs font-bold uppercase theme-text-secondary flex items-center gap-1.5">
                                            <Users size={14} /> {g.name}
                                        </div>
                                        <div className="text-xs font-bold">
                                            {gShots} ({gRel > 0 ? `+${gRel}` : gRel === 0 ? 'E' : gRel})
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Panel de Estadísticas */}
                {playedHoles.length > 0 && (
                    <div className="mb-6 p-4 theme-card rounded-lg border-2 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                            Distribución de Scores ({activeName})
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
                        const holeScore = activeScores[hole.number];
                        const { total, display } = getScoreForHole(hole.number, activeScores);
                        const isExpanded = expandedHole === hole.number;
                        const mainPlayerScore = scores[hole.number];

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
                                        {holeScore && (holeScore.approachShots + holeScore.putts > 0) ? (
                                            <div className="flex gap-3 text-xs font-medium theme-text-secondary">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    App: {holeScore.approachShots}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                    Putts: {holeScore.putts}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs theme-text-tertiary italic">-</span>
                                        )}
                                    </div>

                                    {/* Right: Total Score Active Player */}
                                    <div className="flex items-center gap-2">
                                        <div className={`text-2xl font-mono font-bold w-12 text-center shrink-0 ${getScoreColor(hole.par, total)}`}>
                                            {display}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="theme-bg-secondary border-t theme-border p-3 text-sm animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        {/* Active Player Details */}
                                        <div>
                                            <div className="text-xs font-bold theme-text-primary mb-1 flex items-center gap-1">
                                                {selectedPlayerId === 'main' ? <User size={13} /> : <Users size={13} />}
                                                {activeName}
                                            </div>
                                            {selectedPlayerId === 'main' && mainPlayerScore ? (
                                                <>
                                                    {mainPlayerScore.approachShotsDetails && mainPlayerScore.approachShotsDetails.length > 0 ? (
                                                        <div>
                                                            <div className="grid grid-cols-3 text-[10px] font-bold uppercase theme-text-tertiary mb-2 px-2">
                                                                <span>Club</span>
                                                                <span className="text-center">Distance</span>
                                                                <span className="text-right">Time</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {mainPlayerScore.approachShotsDetails.map((shot, idx) => (
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
                                                        <div className="text-xs theme-text-tertiary italic">
                                                            No shot details recorded
                                                        </div>
                                                    )}

                                                    {/* Tee Info */}
                                                    {mainPlayerScore.teeLocation && (
                                                        <div className="mt-2 pt-2 border-t theme-border flex justify-between text-[10px] theme-text-tertiary">
                                                            <span>Tee Location Set</span>
                                                            <span className="font-mono">
                                                                {mainPlayerScore.teeLocation.latitude.toFixed(5)}, {mainPlayerScore.teeLocation.longitude.toFixed(5)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-xs theme-text-secondary">
                                                    {holeScore && (holeScore.approachShots + holeScore.putts > 0) ? (
                                                        <span>Golpes: {holeScore.approachShots + holeScore.putts} (App: {holeScore.approachShots}, Putts: {holeScore.putts})</span>
                                                    ) : (
                                                        <span className="theme-text-tertiary italic">Sin registrar hoyo {hole.number}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Other Players Comparison Section */}
                                        {((selectedPlayerId !== 'main') || (guests && guests.length > 0)) && (
                                            <div className="pt-2 border-t theme-border">
                                                <div className="text-xs font-bold theme-text-tertiary mb-2 uppercase tracking-wide">
                                                    Otros Jugadores
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {selectedPlayerId !== 'main' && (
                                                        <div className="p-2 rounded-lg theme-bg-primary border theme-border flex items-center justify-between text-xs">
                                                            <span className="font-semibold flex items-center gap-1"><User size={12} /> Jugador Principal</span>
                                                            {mainPlayerScore && (mainPlayerScore.approachShots + mainPlayerScore.putts > 0) ? (
                                                                <span className="theme-text-secondary font-mono font-bold">
                                                                    {mainPlayerScore.approachShots + mainPlayerScore.putts} golpes
                                                                </span>
                                                            ) : (
                                                                <span className="theme-text-tertiary italic">-</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {guests?.filter(g => g.id !== selectedPlayerId).map((g) => {
                                                        const gScore = g.scores[hole.number];
                                                        const gTotal = gScore ? gScore.approachShots + gScore.putts : 0;
                                                        return (
                                                            <div key={g.id} className="p-2 rounded-lg theme-bg-primary border theme-border flex items-center justify-between text-xs">
                                                                <span className="font-semibold flex items-center gap-1"><Users size={12} /> {g.name}</span>
                                                                {gScore && gTotal > 0 ? (
                                                                    <span className="theme-text-secondary font-mono font-bold">
                                                                        {gTotal} golpes
                                                                    </span>
                                                                ) : (
                                                                    <span className="theme-text-tertiary italic">-</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
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

