import { useState } from 'react';
import type { Hole, HoleScore, GolfClub, GeoLocation, GuestPlayer } from '../types';
import { ChevronLeft, ChevronRight, MapPin, Flag, Target, CheckCircle, Loader2, XCircle, BarChart2, Image as ImageIcon, X, Menu, Users, FileText } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { APP_VERSION } from '../constants/version';
import { calculateDistance } from '../utils/geo';

interface HoleViewProps {
    hole: Hole;
    score: HoleScore;
    onUpdateScore: (type: 'approach' | 'putt', delta: number, club?: GolfClub, location?: GeoLocation, isRepresentative?: boolean, fairwayHit?: boolean) => void;
    onNext: () => void;
    onPrev: () => void;
    onFinishRound: () => void;
    onSetTeeLocation?: (location: GeoLocation) => void;
    isFirst: boolean;
    isLast: boolean;
    isReadOnly?: boolean;
    relativeScore: number;
    onMenuClick: () => void;
    guests?: GuestPlayer[];
    onUpdateGuestScore?: (guestId: string, type: 'approach' | 'putt', delta: number) => void;
    onOpenScorecard?: () => void;
    bagClubs: GolfClub[];
    courseName?: string;
    courseId?: string;
    courseHoles?: Hole[];
    allScores?: Record<number, HoleScore>;
}

const isValidCoord = (loc?: { latitude: number; longitude: number } | null): boolean => {
    return Boolean(loc && (loc.latitude !== 0 || loc.longitude !== 0));
};

export const HoleView: React.FC<HoleViewProps> = ({
    hole,
    score,
    onUpdateScore,
    onNext,
    onPrev,
    onFinishRound,
    onSetTeeLocation,
    isFirst,
    isLast,
    isReadOnly = false,
    relativeScore,
    onMenuClick,
    guests,
    onUpdateGuestScore,
    onOpenScorecard,
    bagClubs,
    courseName,
    courseId = '1',
    courseHoles = [],
    allScores = {},
}) => {
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [selectedClub, setSelectedClub] = useState<GolfClub | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isMarkingTee, setIsMarkingTee] = useState(false);
    const [isRepresentative, setIsRepresentative] = useState(false);
    const [fairwayHit, setFairwayHit] = useState(false);
    const [showHoleImage, setShowHoleImage] = useState(false);

    const totalScore = score.approachShots + score.putts;

    const isTeeLocationZero = !isValidCoord(score.teeLocation);
    const isCourseTeePredefined = isValidCoord(hole.teeLocation);

    const lastLocation = (() => {
        const shotsWithLoc = score.approachShotsDetails?.filter(s => isValidCoord(s.location));
        if (shotsWithLoc && shotsWithLoc.length > 0) {
            return shotsWithLoc[shotsWithLoc.length - 1].location;
        }
        return isValidCoord(score.teeLocation) ? score.teeLocation : undefined;
    })();

    const dist = (isValidCoord(hole.greenCenter) && isValidCoord(lastLocation))
        ? calculateDistance(lastLocation!, hole.greenCenter!)
        : null;

    const handleMarkTee = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no está disponible en este dispositivo.');
            return;
        }

        setIsMarkingTee(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onSetTeeLocation?.({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                setIsMarkingTee(false);
            },
            (error) => {
                console.warn('Geolocation error marking tee:', error);
                alert('No se pudo obtener la ubicación GPS. Por favor verifica los permisos de ubicación.');
                setIsMarkingTee(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    };

    const handleAddApproach = () => {
        if (!selectedClub) return;

        // Fairway Hit only applies to the tee shot (first approach) on par 4/5 holes.
        const fairwayHitValue = score.approachShots === 0 && hole.par >= 4 && selectedClub !== 'LostBall'
            ? fairwayHit
            : undefined;

        // Special handling for Lost Ball: No geolocation needed
        if (selectedClub === 'LostBall') {
            onUpdateScore('approach', 1, selectedClub, undefined, isRepresentative, fairwayHitValue);
            setSelectedClub(null);
            setIsRepresentative(false);
            setFairwayHit(false);
            return;
        }

        setIsLocating(true);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    onUpdateScore('approach', 1, selectedClub, {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    }, isRepresentative, fairwayHitValue);
                    setSelectedClub(null);
                    setIsRepresentative(false);
                    setFairwayHit(false);
                    setIsLocating(false);
                },
                (error) => {
                    console.warn("Geolocation error:", error);
                    // Fallback without location if error occurs
                    onUpdateScore('approach', 1, selectedClub, undefined, isRepresentative, fairwayHitValue);
                    setSelectedClub(null);
                    setIsRepresentative(false);
                    setFairwayHit(false);
                    setIsLocating(false);
                },
                // High accuracy for golf course precision
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            // Fallback for browsers without geolocation
            onUpdateScore('approach', 1, selectedClub, undefined, isRepresentative, fairwayHitValue);
            setSelectedClub(null);
            setIsRepresentative(false);
            setFairwayHit(false);
            setIsLocating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full theme-bg-primary theme-text-primary fixed inset-0">
            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-4 theme-bg-secondary theme-border border-b shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-3xl font-black">Hole {hole.number}</h1>
                            {courseName && (
                                <span className="text-xs font-semibold theme-text-tertiary truncate max-w-[140px]">
                                    {courseName}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm font-bold theme-text-secondary mt-1">
                            <span className="flex items-center"><Flag size={14} className="mr-1" /> Par {hole.par}</span>
                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {hole.distance}y</span>
                            <span className="flex items-center text-green-600 dark:text-green-400">
                                <Target size={14} className="mr-1" /> {dist !== null ? `${dist}y` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center">
                    <button
                        onClick={onMenuClick}
                        className="p-3 theme-btn-primary rounded-lg shadow-sm"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-20">

                {/* Tee GPS Marking Alert / Prompt */}
                {!isReadOnly && isTeeLocationZero && (
                    <div className="rounded-2xl p-3 border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-amber-200 dark:bg-amber-800 rounded-xl text-amber-800 dark:text-amber-200 shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-sm">Tee de salida no definido</div>
                                <div className="text-xs text-amber-700 dark:text-amber-300">
                                    Marcá tu posición en el tee mediante GPS para medir tus tiros
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleMarkTee}
                            disabled={isMarkingTee}
                            className="w-full sm:w-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                            {isMarkingTee ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Obteniendo GPS...</span>
                                </>
                            ) : (
                                <>
                                    <MapPin size={14} />
                                    <span>Marcar Tee</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* If Tee is marked by GPS (and was originally zero in course data) */}
                {!isReadOnly && !isTeeLocationZero && !isCourseTeePredefined && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                        <span className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                            Tee de salida marcado {score.teeLocation?.accuracy ? `(±${Math.round(score.teeLocation.accuracy)}m)` : ''}
                        </span>
                        <button
                            onClick={handleMarkTee}
                            disabled={isMarkingTee}
                            className="font-bold underline hover:text-emerald-950 dark:hover:text-emerald-100 disabled:opacity-50"
                        >
                            {isMarkingTee ? 'Actualizando...' : 'Recalibrar'}
                        </button>
                    </div>
                )}

                {/* Total Score Display */}
                <div className="flex flex-col items-center justify-center py-1">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <div className={`text-4xl font-black ${totalScore === 0 ? 'text-gray-400' : 'theme-text-primary text-black'}`}>
                                {totalScore === 0 ? '-' : totalScore}
                            </div>
                            <div className="text-[9px] font-bold theme-text-secondary uppercase tracking-widest mt-0.5">Strokes</div>
                        </div>

                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                        <div className="flex flex-col items-center">
                            <div className={`text-4xl font-black ${relativeScore === 0 ? 'theme-text-accent-blue' : relativeScore < 0 ? 'theme-text-accent-red' : 'theme-text-primary'
                                }`}>
                                {relativeScore > 0 ? `+${relativeScore}` : relativeScore === 0 ? 'E' : relativeScore}
                            </div>
                            <div className="text-[9px] font-bold theme-text-secondary uppercase tracking-widest mt-0.5">To Par</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className={`grid grid-cols-1 gap-3 ${isReadOnly ? 'opacity-80' : ''}`}>

                    {/* Approach Section */}
                    <div className="theme-card-approach rounded-2xl p-3 border-2 space-y-2.5">
                        <div className="text-center font-bold theme-text-approach uppercase tracking-wide text-xs">Approach</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('approach', -1)}
                                className="w-12 h-12 flex items-center justify-center theme-btn-approach rounded-full shadow-sm active:scale-95 transition-transform text-2xl font-bold disabled:opacity-50 disabled:active:scale-100"
                                disabled={isReadOnly || score.approachShots <= 0 || isLocating}
                            >
                                -
                            </button>
                            <span className="text-4xl font-black theme-text-approach w-16 text-center">{score.approachShots}</span>
                            <div className="flex items-center gap-1.5">
                                {!isReadOnly && selectedClub && selectedClub !== 'LostBall' && score.approachShots === 0 && hole.par >= 4 && (
                                    <button
                                        onClick={() => setFairwayHit(!fairwayHit)}
                                        className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border-2 shadow-sm transition-all active:scale-95 ${fairwayHit
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-400'
                                            }`}
                                        title={fairwayHit ? 'Fairway hit' : 'Missed fairway (Rough / Penalty)'}
                                    >
                                        <Target size={16} className={fairwayHit ? '' : 'opacity-40'} />
                                        <span className="text-[7px] font-black mt-0.5 tracking-tighter leading-none">
                                            {fairwayHit ? 'FAIRWAY' : 'MISS'}
                                        </span>
                                    </button>
                                )}
                                {!isReadOnly && selectedClub && selectedClub !== 'LostBall' && (
                                    <button
                                        onClick={() => setIsRepresentative(!isRepresentative)}
                                        className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border-2 shadow-sm transition-all active:scale-95 ${isRepresentative
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-400'
                                            }`}
                                        title={isRepresentative ? 'Representative shot for stats' : 'Exclude from stats (Bad shot / Recovery)'}
                                    >
                                        <BarChart2 size={16} className={isRepresentative ? '' : 'opacity-40'} />
                                        <span className="text-[7px] font-black mt-0.5 tracking-tighter leading-none">
                                            {isRepresentative ? 'STATS' : 'NO STATS'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={handleAddApproach}
                                    className={`w-12 h-12 flex items-center justify-center rounded-full shadow-md active:scale-95 transition-transform text-2xl font-bold border-2 ${selectedClub
                                        ? 'theme-btn-approach border-current'
                                        : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                        }`}
                                    disabled={isReadOnly || !selectedClub || isLocating}
                                >
                                    {isLocating ? <Loader2 className="animate-spin" size={20} /> : '+'}
                                </button>
                            </div>
                        </div>

                        {/* Club Selection Grid */}
                        {!isReadOnly && (
                            <div className="pt-2 border-t theme-border-approach opacity-90">
                                <div className="grid grid-cols-5 gap-1.5">
                                    {([...bagClubs, 'LostBall'] as GolfClub[]).map(club => (
                                        <button
                                            key={club}
                                            onClick={() => setSelectedClub(club)}
                                            className={`py-2.5 px-1 rounded-xl text-base sm:text-lg font-black transition-all border-2 flex items-center justify-center leading-none ${selectedClub === club
                                                ? club === 'LostBall'
                                                    ? 'bg-red-100 text-red-600 border-red-500 ring-2 ring-offset-1 ring-red-200 scale-105'
                                                    : 'theme-btn-approach ring-2 ring-offset-1 ring-blue-400 scale-105'
                                                : club === 'LostBall'
                                                    ? 'bg-red-50 text-red-400 border-red-100 hover:border-red-300'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                                                }`}
                                            title={club === 'LostBall' ? "Lost Ball (Penalty)" : club}
                                        >
                                            {club === 'LostBall' ? <XCircle size={20} /> : club}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Putting Section */}
                    <div className="theme-card-putt rounded-2xl p-3 border-2">
                        <div className="text-center mb-2 font-bold theme-text-putt uppercase tracking-wide text-xs">Putting (Green)</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('putt', -1)}
                                className="w-12 h-12 flex items-center justify-center theme-btn-putt rounded-full shadow-sm active:scale-95 transition-transform text-2xl font-bold disabled:opacity-50 disabled:active:scale-100"
                                disabled={isReadOnly || score.putts <= 0}
                            >
                                -
                            </button>
                            <span className="text-4xl font-black theme-text-putt w-16 text-center">{score.putts}</span>
                            <button
                                onClick={() => onUpdateScore('putt', 1)}
                                className="w-12 h-12 flex items-center justify-center theme-btn-putt rounded-full shadow-md active:scale-95 transition-transform text-2xl font-bold disabled:opacity-50 disabled:active:scale-100"
                                disabled={isReadOnly}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Guests Section */}
                    {guests && guests.length > 0 && (
                        <div className="space-y-4 pt-4 border-t theme-border">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-center theme-text-secondary flex items-center justify-center gap-2">
                                <Users size={16} /> Scores de Invitados (Hoyo {hole.number})
                            </h3>
                            {guests.map((guest) => {
                                const guestHoleScore = guest.scores[hole.number] || { approachShots: 0, putts: 0 };
                                const guestTotal = guestHoleScore.approachShots + guestHoleScore.putts;
                                return (
                                    <div key={guest.id} className="theme-card rounded-2xl p-4 border-2 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-lg">{guest.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs theme-text-secondary uppercase font-semibold">Total</span>
                                                <span className="text-xl font-black bg-blue-600 text-white px-3 py-0.5 rounded-full">
                                                    {guestTotal}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Approach & Putts control */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Guest Approach */}
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border theme-border flex flex-col items-center">
                                                <span className="text-xs font-semibold theme-text-secondary uppercase mb-1">Approach</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => onUpdateGuestScore?.(guest.id, 'approach', -1)}
                                                        disabled={isReadOnly || guestHoleScore.approachShots <= 0}
                                                        className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-2xl font-bold w-6 text-center">{guestHoleScore.approachShots}</span>
                                                    <button
                                                        onClick={() => onUpdateGuestScore?.(guest.id, 'approach', 1)}
                                                        disabled={isReadOnly}
                                                        className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Guest Putts */}
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border theme-border flex flex-col items-center">
                                                <span className="text-xs font-semibold theme-text-secondary uppercase mb-1">Putts</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => onUpdateGuestScore?.(guest.id, 'putt', -1)}
                                                        disabled={isReadOnly || guestHoleScore.putts <= 0}
                                                        className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-2xl font-bold w-6 text-center">{guestHoleScore.putts}</span>
                                                    <button
                                                        onClick={() => onUpdateGuestScore?.(guest.id, 'putt', 1)}
                                                        disabled={isReadOnly}
                                                        className="w-10 h-10 rounded-full bg-green-600 text-white font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Compact Out / In Scorecard Table */}
                    {courseHoles.length > 0 && (() => {
                        const outHoles = courseHoles.filter(h => h.number <= 9);
                        const inHoles = courseHoles.filter(h => h.number > 9);

                        // Helper to format player initials / short name
                        const getShortName = (fullName: string, isMain?: boolean) => {
                            if (isMain) return 'Tú';
                            const parts = fullName.trim().split(/\s+/);
                            if (parts.length === 1) return parts[0].slice(0, 4);
                            return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
                        };

                        interface PlayerRowData {
                            id: string;
                            name: string;
                            shortName: string;
                            isMain?: boolean;
                            scores: Record<number, { approachShots: number; putts: number }>;
                        }

                        const players: PlayerRowData[] = [
                            {
                                id: 'main',
                                name: 'Jugador Principal',
                                shortName: getShortName('Tú', true),
                                isMain: true,
                                scores: allScores,
                            },
                            ...(guests || []).map(g => ({
                                id: g.id,
                                name: g.name,
                                shortName: getShortName(g.name),
                                isMain: false,
                                scores: g.scores,
                            }))
                        ];

                        const getPlayerScore = (playerScores: Record<number, { approachShots: number; putts: number }>, hNum: number) => {
                            const sc = playerScores[hNum];
                            if (!sc) return null;
                            const total = sc.approachShots + sc.putts;
                            return total > 0 ? total : null;
                        };

                        const getScoreStyle = (playerScores: Record<number, { approachShots: number; putts: number }>, hNum: number, par: number) => {
                            const isCurrent = hNum === hole.number;
                            const sc = getPlayerScore(playerScores, hNum);
                            if (sc === null) {
                                return isCurrent
                                    ? 'border-2 border-blue-500 bg-blue-500/15 font-bold text-blue-600 dark:text-blue-400'
                                    : 'theme-text-tertiary';
                            }
                            const diff = sc - par;
                            let style = 'font-bold ';
                            if (diff <= -2) style += 'bg-amber-400/20 text-amber-600 dark:text-amber-400';
                            else if (diff === -1) style += 'bg-rose-500/20 text-rose-600 dark:text-rose-400';
                            else if (diff === 0) style += 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
                            else if (diff === 1) style += 'bg-slate-400/20 text-slate-700 dark:text-slate-300';
                            else style += 'bg-zinc-600/20 text-zinc-800 dark:text-zinc-200';

                            if (isCurrent) {
                                style += ' ring-1.5 ring-blue-500';
                            }
                            return style;
                        };

                        // Par totals
                        const outPar = outHoles.reduce((acc, h) => acc + h.par, 0);
                        const inPar = inHoles.reduce((acc, h) => acc + h.par, 0);
                        const totalPar = outPar + inPar;

                        // Main player summary for card header
                        const mainOutTotal = outHoles.reduce((acc, h) => {
                            const sc = getPlayerScore(allScores, h.number);
                            return acc + (sc !== null ? sc : 0);
                        }, 0);
                        const mainInTotal = inHoles.reduce((acc, h) => {
                            const sc = getPlayerScore(allScores, h.number);
                            return acc + (sc !== null ? sc : 0);
                        }, 0);
                        const mainTotalScore = mainOutTotal + mainInTotal;
                        const mainPlayedCount = courseHoles.filter(h => getPlayerScore(allScores, h.number) !== null).length;

                        const renderSection = (title: string, holes: typeof courseHoles, subtotalLabel: string, subtotalPar: number) => (
                            <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse">
                                    <thead>
                                        <tr className="border-b theme-border font-bold theme-text-tertiary">
                                            <th className="py-1 px-0.5 text-left w-9 uppercase text-[11px]">{title}</th>
                                            {holes.map(h => (
                                                <th
                                                    key={h.number}
                                                    className={`py-1 px-0 text-[13px] font-semibold ${h.number === hole.number ? 'text-blue-600 dark:text-blue-400 font-black' : ''}`}
                                                >
                                                    {h.number}
                                                </th>
                                            ))}
                                            <th className="py-1 px-0.5 font-black theme-text-primary text-[13px] w-8">{subtotalLabel}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Par row */}
                                        <tr className="border-b theme-border opacity-70">
                                            <td className="py-1 px-0.5 text-left font-semibold theme-text-secondary text-[11px]">Par</td>
                                            {holes.map(h => (
                                                <td key={h.number} className="py-1 px-0 text-xs font-semibold">
                                                    {h.par}
                                                </td>
                                            ))}
                                            <td className="py-1 px-0.5 font-bold text-xs">{subtotalPar}</td>
                                        </tr>
                                        {/* Player Score rows */}
                                        {players.map((p, pIdx) => {
                                            const subtotal = holes.reduce((acc, h) => {
                                                const sc = getPlayerScore(p.scores, h.number);
                                                return acc + (sc !== null ? sc : 0);
                                            }, 0);
                                            const playedCount = holes.filter(h => getPlayerScore(p.scores, h.number) !== null).length;

                                            return (
                                                <tr key={p.id} className={pIdx > 0 ? 'border-t theme-border/60' : ''}>
                                                    <td className="py-1 px-0.5 text-left font-bold theme-text-primary truncate max-w-[40px] text-xs" title={p.name}>
                                                        <span className="flex items-center gap-1">
                                                            <span className="truncate">{p.shortName}</span>
                                                        </span>
                                                    </td>
                                                    {holes.map(h => {
                                                        const sc = getPlayerScore(p.scores, h.number);
                                                        return (
                                                            <td key={h.number} className="py-1 px-0">
                                                                <span className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-md text-base font-bold leading-none ${getScoreStyle(p.scores, h.number, h.par)}`}>
                                                                    {sc !== null ? sc : '-'}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-1 px-0.5 font-black text-base theme-text-primary">
                                                        {playedCount > 0 ? subtotal : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );

                        return (
                            <div className="theme-card rounded-2xl p-2.5 sm:p-3 border theme-border space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider theme-text-secondary">
                                        <BarChart2 size={14} />
                                        <span>Resumen de Ronda</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <span className="theme-text-tertiary">Total:</span>
                                        <span className="font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                            {mainPlayedCount > 0 ? `${mainTotalScore} (${mainTotalScore - totalPar >= 0 ? `+${mainTotalScore - totalPar}` : mainTotalScore - totalPar})` : `Par ${totalPar}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Ida (1-9) */}
                                {outHoles.length > 0 && renderSection('Ida', outHoles, 'OUT', outPar)}

                                {/* Vuelta (10-18) */}
                                {inHoles.length > 0 && (
                                    <div className="pt-2 border-t theme-border">
                                        {renderSection('Vuelta', inHoles, 'IN', inPar)}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Action Buttons: Finish Round, Scorecard, Map */}
                    <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <button
                                onClick={() => setShowFinishModal(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 theme-accent-green rounded-xl border-2 font-bold text-xs shadow-sm active:scale-95 transition-transform"
                                title="Finish Round"
                            >
                                <CheckCircle size={16} />
                                <span>Finalizar</span>
                            </button>
                        )}
                        {onOpenScorecard && (
                            <button
                                onClick={onOpenScorecard}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 theme-card rounded-xl border theme-border font-bold text-xs shadow-sm active:scale-95 transition-transform theme-text-primary hover:border-blue-400"
                                title="Scorecard"
                            >
                                <FileText size={16} />
                                <span>Scorecard</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowHoleImage(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 theme-card rounded-xl border theme-border font-bold text-xs shadow-sm active:scale-95 transition-transform theme-text-primary hover:border-blue-400"
                            title="View Hole Map"
                        >
                            <ImageIcon size={16} />
                            <span>Mapa</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="relative p-4 theme-nav border-t sticky bottom-0 grid grid-cols-2 gap-4">
                <button
                    onClick={onPrev}
                    disabled={isFirst}
                    className={`flex items-center justify-center p-4 rounded-xl font-bold text-lg transition-colors border-2 ${isFirst
                        ? 'theme-bg-tertiary theme-text-tertiary border-transparent'
                        : 'theme-bg-secondary theme-text-primary theme-border active:brightness-90'
                        }`}
                >
                    <ChevronLeft className="mr-2" /> Prev
                </button>
                <button
                    onClick={isLast ? () => setShowFinishModal(true) : onNext}
                    className={`flex items-center justify-center p-4 rounded-xl font-bold text-lg transition-colors border-2 ${isLast
                        ? 'theme-bg-primary theme-text-primary theme-border active:brightness-90'
                        : 'theme-bg-primary theme-text-primary theme-border active:brightness-90'
                        }`}
                >
                    {isLast ? (
                        <>Finish <CheckCircle className="ml-2" /></>
                    ) : (
                        <>Next <ChevronRight className="ml-2" /></>
                    )}
                </button>
                {/* Version indicator */}
                <span className="absolute bottom-1 left-2 text-[10px] text-gray-400 font-mono">
                    v{APP_VERSION}
                </span>
            </div>

            {/* Finish Round Confirmation Modal */}
            <ConfirmModal
                isOpen={showFinishModal}
                title="Finish Round?"
                message="Are you sure you want to finish this round? You can view it later in your rounds history."
                confirmText="Finish Round"
                cancelText="Continue Playing"
                confirmButtonClass="bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                onConfirm={() => {
                    setShowFinishModal(false);
                    onFinishRound();
                }}
                onCancel={() => setShowFinishModal(false)}
            />

            {/* Hole Image Modal */}
            {showHoleImage && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in">
                    <div className="flex justify-between items-center p-4 shrink-0 border-b border-white/10">
                        <span className="text-white font-bold text-lg">
                            {courseName || 'Campo'} • Hoyo {hole.number}
                        </span>
                        <button
                            onClick={() => setShowHoleImage(false)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        {courseId === '1' ? (
                            <img
                                src={`/fields/CdeC/hoyo-${hole.number}.jpg`}
                                alt={`Hole ${hole.number} Map`}
                                className="max-w-full max-h-full object-contain rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="text-center text-white/70 space-y-2 p-6">
                                <ImageIcon size={48} className="mx-auto opacity-40" />
                                <p className="font-semibold text-lg">Mapa no disponible</p>
                                <p className="text-sm text-white/50">El mapa visual para este campo aún no está disponible.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
