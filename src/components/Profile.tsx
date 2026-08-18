import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { APP_VERSION } from '../constants/version';
import type { HandicapBreakdown, HistoricalClubDistance, LostBallsAverage } from '../utils/stats';
import type { GolfClub } from '../types';
import { BagManager } from './BagManager';

interface ProfileProps {
    playerName: string;
    breakdown: HandicapBreakdown;
    roundsCount: number;
    lostBallsAverage: LostBallsAverage | null;
    historicalClubDistances: HistoricalClubDistance[];
    bag: GolfClub[];
    onAddClub: (club: GolfClub) => void;
    onRemoveClub: (club: GolfClub) => void;
    onMoveClub: (fromIndex: number, toIndex: number) => void;
    onNameChange: (name: string) => void;
    onMenuClick: () => void;
    onBack: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ playerName, breakdown, roundsCount, lostBallsAverage, historicalClubDistances, bag, onAddClub, onRemoveClub, onMoveClub, onNameChange, onMenuClick, onBack }) => {
    const formatHandicap = (handicap: number): string =>
        handicap < 0 ? `+${Math.abs(handicap).toFixed(1)}` : handicap.toFixed(1);

    const formatDate = (date: Date): string =>
        date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <div className="flex flex-col h-screen w-full theme-bg-primary theme-text-primary fixed inset-0">
            {/* Header - Fixed at top */}
            <div className="relative p-4 theme-bg-secondary theme-border border-b flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 mr-4 theme-btn-primary rounded-full shadow-sm">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold">Perfil</h1>
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
            <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
                {/* Nombre */}
                <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
                    <label className="text-sm font-bold uppercase tracking-wider theme-text-secondary block mb-2">
                        Nombre
                    </label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Tu nombre"
                        className="p-3 rounded-lg border theme-border theme-card theme-text-primary w-full"
                    />
                </div>

                {/* Mi Bolsa */}
                <BagManager bag={bag} onAddClub={onAddClub} onRemoveClub={onRemoveClub} onMoveClub={onMoveClub} />

                {/* Hándicap estimado */}
                <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                        Hándicap estimado
                    </h3>
                    {breakdown.handicap === null ? (
                        <div className="text-4xl font-black theme-text-tertiary">-</div>
                    ) : (
                        <div className="text-4xl font-black">{formatHandicap(breakdown.handicap)}</div>
                    )}
                    <div className="text-xs theme-text-tertiary mt-1">
                        {breakdown.handicap === null
                            ? 'Necesitás al menos 3 rondas de 18 hoyos para calcular tu Hándicap Índice (WHS)'
                            : `Índice WHS — promedio de tus mejores ${breakdown.usedCount} diferenciales de tus últimas ${breakdown.rounds.length} rondas de 18 hoyos`}
                    </div>
                    {breakdown.rounds.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {breakdown.rounds.map((round) => (
                                <div
                                    key={round.id}
                                    className="flex items-center justify-between p-2 rounded-lg theme-bg-tertiary"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm theme-text-primary">
                                            {round.date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                        <span className="text-xs theme-text-tertiary">
                                            Bruto {round.grossScore} · Ajustado {round.adjustedGrossScore}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold theme-text-primary">
                                        {round.differential.toFixed(1)}
                                        {round.usedInIndex && <span className="theme-text-accent-green text-xs"> · usada</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Promedio de bolas perdidas (últimas 5 rondas) */}
                <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                        Promedio de bolas perdidas
                    </h3>
                    {lostBallsAverage === null ? (
                        <div className="text-4xl font-black theme-text-tertiary">-</div>
                    ) : (
                        <div className="text-4xl font-black">{lostBallsAverage.average.toFixed(1)}</div>
                    )}
                    <div className="text-xs theme-text-tertiary mt-1">
                        {lostBallsAverage === null
                            ? 'Necesitás rondas jugadas para calcular tu promedio'
                            : `${lostBallsAverage.totalLostBalls} bolas perdidas en tus últimas ${lostBallsAverage.roundsConsidered} rondas`}
                    </div>
                </div>

                {/* Mayor distancia histórica por palo (últimas 10 rondas) */}
                <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                        Mayor distancia por palo
                    </h3>
                    <div className="text-xs theme-text-tertiary mb-3">
                        Últimas 10 rondas
                    </div>
                    {historicalClubDistances.length === 0 ? (
                        <div className="text-xs theme-text-tertiary italic">
                            Sin datos de distancia aún
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {historicalClubDistances.map((item) => (
                                <div
                                    key={item.club}
                                    className="flex items-center justify-between p-2 rounded-lg theme-bg-tertiary"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold theme-text-primary">{item.club}</span>
                                        <span className="text-xs theme-text-tertiary">
                                            {formatDate(item.date)} · Hoyo {item.holeNumber}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold font-mono theme-text-primary">{item.distance}y</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rondas completadas */}
                <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                        Rondas completadas
                    </h3>
                    <div className="text-4xl font-black">{roundsCount}</div>
                </div>
            </div>
        </div>
    );
};
