import React, { useState } from 'react';
import type { Hole, HoleScore, GuestPlayer } from '../types';
import { ArrowLeft, Menu, Users, User, Edit2 } from 'lucide-react';
import { APP_VERSION } from '../constants/version';
import { calculateRelativeScore, calculateScoreDistribution } from '../utils/score';
import { countLostBalls, maxDistanceByClub } from '../utils/stats';


interface ScorecardProps {
    course: Hole[];
    scores: Record<number, HoleScore>;
    onBack: () => void;
    onMenuClick: () => void;
    guests?: GuestPlayer[];
    onEditHole?: (holeNumber: number) => void;
    courseName?: string;
    activeHoleNumber?: number;
}

export const Scorecard: React.FC<ScorecardProps> = ({
    course,
    scores,
    onBack,
    onMenuClick,
    guests,
    onEditHole,
    courseName,
    activeHoleNumber,
}) => {
    const [expandedHole, setExpandedHole] = useState<number | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('main');

    const selectedGuest = guests?.find(g => g.id === selectedPlayerId);
    const activeName = selectedPlayerId === 'main' ? 'Jugador Principal' : (selectedGuest?.name || 'Invitado');
    const activeScores = selectedPlayerId === 'main' 
        ? scores 
        : (selectedGuest?.scores || {});

    const playedHoles = course.filter(hole =>
        (activeHoleNumber === undefined || hole.number !== activeHoleNumber) &&
        activeScores[hole.number] &&
        ((activeScores[hole.number].approachShots || 0) + (activeScores[hole.number].putts || 0) > 0)
    );
    const totalShots = playedHoles.reduce((acc, hole) => {
        const s = activeScores[hole.number];
        return acc + (s?.approachShots || 0) + (s?.putts || 0);
    }, 0);
    const totalPar = playedHoles.reduce((acc, hole) => acc + hole.par, 0);
    const relativeScore = calculateRelativeScore(course, activeScores, activeHoleNumber);
    const scoreDistribution = calculateScoreDistribution(course, activeScores, activeHoleNumber);

    const lostBalls = countLostBalls(scores);
    const clubDistances = maxDistanceByClub(scores);

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

    const getScoreColor = (par: number, score: number, isInProgress?: boolean) => {
        if (score === 0 || isInProgress) return 'theme-text-tertiary';
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
                    <div>
                        <h1 className="text-2xl font-bold">Scorecard</h1>
                        {courseName && (
                            <p className="text-xs font-semibold theme-text-secondary">{courseName}</p>
                        )}
                    </div>
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
                                const gPlayed = course.filter(h => (activeHoleNumber === undefined || h.number !== activeHoleNumber) && g.scores[h.number] && (g.scores[h.number].approachShots + g.scores[h.number].putts > 0));
                                const gShots = gPlayed.reduce((acc, h) => {
                                    const s = g.scores[h.number];
                                    return acc + (s?.approachShots || 0) + (s?.putts || 0);
                                }, 0);
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
                            {statItems
                                .filter((item) => item.count > 0)
                                .map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-xl border theme-border transition-all duration-200 theme-bg-primary hover:scale-[1.02] shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.colorClass}`} />
                                            <span className="text-xs font-semibold theme-text-secondary truncate">{item.label}</span>
                                        </div>
                                        <span className={`text-xs font-black shrink-0 ${item.textClass}`}>
                                            {item.count}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Bolas perdidas y distancias (main player only) */}
                {selectedPlayerId === 'main' && (
                    <div className="mb-6 p-4 theme-card rounded-lg border-2 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                            Bolas perdidas y distancias
                        </h3>

                        <div className="flex items-center justify-between p-3 rounded-xl border theme-border mb-4 theme-bg-primary shadow-sm">
                            <span className="text-sm font-semibold theme-text-secondary">Bolas perdidas</span>
                            <span className="text-2xl font-black theme-text-primary">{lostBalls}</span>
                        </div>

                        <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                            Mayor distancia por palo
                        </div>
                        {clubDistances.length === 0 ? (
                            <div className="text-xs theme-text-tertiary italic">
                                Sin datos de distancia aún
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {clubDistances.map((item) => (
                                    <div
                                        key={item.club}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl border theme-border theme-bg-primary hover:scale-[1.02] shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        <span className="text-xs font-black theme-text-primary">{item.club}</span>
                                        <span className="text-xs font-semibold theme-text-secondary font-mono">{item.distance}y</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Scorecard Grid Section (Out / In) */}
                <div className="mb-6 theme-card rounded-2xl p-3 border theme-border space-y-4 shadow-sm">
                    {course.length > 0 && (() => {
                        const outHoles = course.filter(h => h.number <= 9);
                        const inHoles = course.filter(h => h.number > 9);

                        const getScoreStyle = (total: number | null, par: number, isSelected: boolean) => {
                            if (total === null) {
                                return isSelected
                                    ? 'border-2 border-blue-500 bg-blue-500/15 font-bold text-blue-600 dark:text-blue-400'
                                    : 'theme-text-tertiary';
                            }
                            const diff = total - par;
                            let style = 'font-black text-white shadow-xs ';
                            if (diff <= -2) {
                                style += 'bg-amber-500 border border-amber-600';
                            } else if (diff === -1) {
                                style += 'bg-rose-500 border border-rose-600';
                            } else if (diff === 0) {
                                style += 'bg-emerald-600 border border-emerald-700';
                            } else if (diff === 1) {
                                style += 'bg-slate-500 border border-slate-600';
                            } else {
                                style += 'bg-zinc-700 border border-zinc-800';
                            }

                            if (isSelected) {
                                style += ' ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900';
                            }
                            return style;
                        };

                        const renderSection = (title: string, holes: Hole[], subtotalLabel: string, subtotalPar: number) => {
                            const subtotalApp = holes.reduce((acc, h) => {
                                const sc = activeScores[h.number];
                                return acc + (sc ? sc.approachShots : 0);
                            }, 0);
                            const subtotalPutts = holes.reduce((acc, h) => {
                                const sc = activeScores[h.number];
                                return acc + (sc ? sc.putts : 0);
                            }, 0);
                            const playedCount = holes.filter(h => {
                                const sc = activeScores[h.number];
                                return sc && (sc.approachShots + sc.putts > 0);
                            }).length;
                            const subtotalTotal = subtotalApp + subtotalPutts;

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-center border-collapse">
                                        <thead>
                                            <tr className="border-b theme-border font-bold theme-text-tertiary">
                                                <th className="py-1 px-0.5 text-left w-10 uppercase text-[11px]">{title}</th>
                                                {holes.map(h => {
                                                    const isSelected = expandedHole === h.number;
                                                    return (
                                                        <th
                                                            key={h.number}
                                                            onClick={() => toggleHole(h.number)}
                                                            className={`py-1 px-0 text-[13px] font-semibold cursor-pointer transition-colors hover:text-blue-500 ${
                                                                isSelected ? 'text-blue-600 dark:text-blue-400 font-black' : ''
                                                            }`}
                                                        >
                                                            {h.number}
                                                        </th>
                                                    );
                                                })}
                                                <th className="py-1 px-0.5 font-black theme-text-primary text-[13px] w-9">{subtotalLabel}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Par row */}
                                            <tr className="border-b theme-border opacity-70">
                                                <td className="py-1 px-0.5 text-left font-semibold theme-text-secondary text-[11px]">Par</td>
                                                {holes.map(h => (
                                                    <td
                                                        key={h.number}
                                                        onClick={() => toggleHole(h.number)}
                                                        className="py-1 px-0 text-xs font-semibold cursor-pointer"
                                                    >
                                                        {h.par}
                                                    </td>
                                                ))}
                                                <td className="py-1 px-0.5 font-bold text-xs">{subtotalPar}</td>
                                            </tr>

                                            {/* Approach row */}
                                            <tr className="border-b theme-border/50 text-xs text-blue-600 dark:text-blue-400">
                                                <td className="py-1 px-0.5 text-left font-bold truncate text-[11px]">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        App
                                                    </span>
                                                </td>
                                                {holes.map(h => {
                                                    const sc = activeScores[h.number];
                                                    const hasShots = sc && (sc.approachShots + sc.putts > 0);
                                                    return (
                                                        <td
                                                            key={h.number}
                                                            onClick={() => toggleHole(h.number)}
                                                            className="py-1 px-0 font-medium cursor-pointer"
                                                        >
                                                            {hasShots ? sc.approachShots : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-1 px-0.5 font-bold">
                                                    {playedCount > 0 ? subtotalApp : '-'}
                                                </td>
                                            </tr>

                                            {/* Putts row */}
                                            <tr className="border-b theme-border/50 text-xs text-emerald-600 dark:text-emerald-400">
                                                <td className="py-1 px-0.5 text-left font-bold truncate text-[11px]">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Putt
                                                    </span>
                                                </td>
                                                {holes.map(h => {
                                                    const sc = activeScores[h.number];
                                                    const hasShots = sc && (sc.approachShots + sc.putts > 0);
                                                    return (
                                                        <td
                                                            key={h.number}
                                                            onClick={() => toggleHole(h.number)}
                                                            className="py-1 px-0 font-medium cursor-pointer"
                                                        >
                                                            {hasShots ? sc.putts : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-1 px-0.5 font-bold">
                                                    {playedCount > 0 ? subtotalPutts : '-'}
                                                </td>
                                            </tr>

                                            {/* Total row with colored pill styles */}
                                            <tr>
                                                <td className="py-1 px-0.5 text-left font-bold theme-text-primary truncate text-[11px]">
                                                    Total
                                                </td>
                                                {holes.map(h => {
                                                    const sc = activeScores[h.number];
                                                    const total = sc && (sc.approachShots + sc.putts > 0) ? sc.approachShots + sc.putts : null;
                                                    const isSelected = expandedHole === h.number;
                                                    return (
                                                        <td
                                                            key={h.number}
                                                            onClick={() => toggleHole(h.number)}
                                                            className="py-1 px-0 cursor-pointer"
                                                        >
                                                            <span className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-md text-sm font-bold leading-none ${getScoreStyle(total, h.par, isSelected)}`}>
                                                                {total !== null ? total : '-'}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-1 px-0.5 font-black text-sm theme-text-primary">
                                                    {playedCount > 0 ? subtotalTotal : '-'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            );
                        };

                        const outPar = outHoles.reduce((acc, h) => acc + h.par, 0);
                        const inPar = inHoles.reduce((acc, h) => acc + h.par, 0);

                        return (
                            <div className="space-y-4">
                                <div className="text-xs font-bold uppercase tracking-wider theme-text-tertiary flex items-center justify-between">
                                    <span>Grilla de Ronda ({activeName})</span>
                                    <span className="text-[11px] font-normal normal-case opacity-75">Tocá un hoyo para ver o editar detalle</span>
                                </div>

                                {/* Ida (1-9) */}
                                {outHoles.length > 0 && renderSection('Ida', outHoles, 'OUT', outPar)}

                                {/* Vuelta (10-18) */}
                                {inHoles.length > 0 && (
                                    <div className="pt-3 border-t theme-border">
                                        {renderSection('Vuelta', inHoles, 'IN', inPar)}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Selected Hole Execution & Edit Details */}
                {expandedHole !== null && (() => {
                    const hole = course.find(h => h.number === expandedHole);
                    if (!hole) return null;

                    const holeScore = activeScores[hole.number];
                    const mainPlayerScore = scores[hole.number];
                    const { display, total } = getScoreForHole(hole.number, activeScores);
                    const isHoleInProgress = activeHoleNumber === hole.number;

                    return (
                        <div className="theme-card rounded-2xl shadow-sm border-2 border-blue-500/50 p-4 space-y-4 mb-6 animate-in slide-in-from-top-2 duration-200">
                            {/* Hole Header Summary */}
                            <div className="flex items-center justify-between pb-3 border-b theme-border">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black theme-text-primary uppercase tracking-wide">
                                            Hoyo {hole.number}
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                                            Par {hole.par} • {hole.distance}y
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium theme-text-secondary mt-1">
                                        {holeScore && (holeScore.approachShots + holeScore.putts > 0) ? (
                                            <>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    App: {holeScore.approachShots}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Putts: {holeScore.putts}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="theme-text-tertiary italic">Sin golpes registrados</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold theme-text-tertiary">Total</div>
                                    <div className={`text-3xl font-mono font-black ${getScoreColor(hole.par, total, isHoleInProgress)}`}>
                                        {display}
                                    </div>
                                </div>
                            </div>

                            {/* Active Player Detailed Club Execution (Yards per club) */}
                            <div>
                                <div className="text-xs font-bold theme-text-primary mb-2 flex items-center gap-1.5">
                                    {selectedPlayerId === 'main' ? <User size={14} /> : <Users size={14} />}
                                    <span>Detalle de Ejecución: {activeName}</span>
                                </div>

                                {selectedPlayerId === 'main' && mainPlayerScore ? (
                                    <>
                                        {mainPlayerScore.approachShotsDetails && mainPlayerScore.approachShotsDetails.length > 0 ? (
                                            <div className="space-y-1.5">
                                                <div className="grid grid-cols-3 text-[10px] font-bold uppercase theme-text-tertiary px-2">
                                                    <span>Palo</span>
                                                    <span className="text-center">Distancia</span>
                                                    <span className="text-right">Hora</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {mainPlayerScore.approachShotsDetails.map((shot, idx) => (
                                                        <div key={idx} className="grid grid-cols-3 items-center p-2 rounded-xl theme-bg-primary theme-border border text-xs">
                                                            <span className="font-bold theme-text-primary">{shot.club}</span>
                                                            <span className="text-center theme-text-secondary font-mono font-semibold">
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
                                            <div className="text-xs theme-text-tertiary italic p-2 rounded-lg theme-bg-primary border theme-border">
                                                No hay detalle de tiros por palo registrado
                                            </div>
                                        )}

                                        {/* Tee Location */}
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
                                    <div className="text-xs theme-text-secondary p-2 rounded-lg theme-bg-primary border theme-border">
                                        {holeScore && (holeScore.approachShots + holeScore.putts > 0) ? (
                                            <span>Golpes registrados: {holeScore.approachShots + holeScore.putts} (App: {holeScore.approachShots}, Putts: {holeScore.putts})</span>
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
                                                        {mainPlayerScore.approachShots + mainPlayerScore.putts} golpes (App: {mainPlayerScore.approachShots}, Putts: {mainPlayerScore.putts})
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
                                                            {gTotal} golpes (App: {gScore.approachShots}, Putts: {gScore.putts})
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

                            {/* Action Button: Edit Hole */}
                            {onEditHole && (
                                <div className="pt-2 border-t theme-border flex justify-end">
                                    <button
                                        onClick={() => onEditHole(hole.number)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl theme-btn-primary text-xs font-bold shadow-sm active:scale-95 transition-transform"
                                    >
                                        <Edit2 size={14} />
                                        Editar Hoyo {hole.number}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
