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
    // onSetTeeLocation removed as it is auto-set
    isFirst: boolean;
    isLast: boolean;
    isReadOnly?: boolean;
    relativeScore: number;
    onMenuClick: () => void;
    guests?: GuestPlayer[];
    onUpdateGuestScore?: (guestId: string, type: 'approach' | 'putt', delta: number) => void;
    onOpenScorecard?: () => void;
    bagClubs: GolfClub[];
}

export const HoleView: React.FC<HoleViewProps> = ({
    hole,
    score,
    onUpdateScore,
    onNext,
    onPrev,
    onFinishRound,
    isFirst,
    isLast,
    isReadOnly = false,
    relativeScore,
    onMenuClick,
    guests,
    onUpdateGuestScore,
    onOpenScorecard,
    bagClubs,
}) => {
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [selectedClub, setSelectedClub] = useState<GolfClub | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isRepresentative, setIsRepresentative] = useState(false);
    const [fairwayHit, setFairwayHit] = useState(false);
    const [showHoleImage, setShowHoleImage] = useState(false);

    const totalScore = score.approachShots + score.putts;




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
                        <h1 className="text-3xl font-black">Hole {hole.number}</h1>
                        <div className="flex items-center space-x-3 text-sm font-bold theme-text-secondary mt-1">
                            <span className="flex items-center"><Flag size={14} className="mr-1" /> Par {hole.par}</span>
                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {hole.distance}y</span>

                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenScorecard && (
                        <button
                            onClick={onOpenScorecard}
                            className="p-2 theme-btn-primary rounded-lg shadow-sm active:scale-95 transition-transform"
                            title="Scorecard"
                        >
                            <FileText size={20} />
                        </button>
                    )}
                    {!isReadOnly && (
                        <button
                            onClick={() => setShowFinishModal(true)}
                            className="p-2 theme-accent-green rounded-lg shadow-sm border-2 active:scale-95 transition-transform"
                            title="Finish Round"
                        >
                            <CheckCircle size={20} />
                        </button>
                    )}
                    <button
                        onClick={onMenuClick}
                        className="p-3 theme-btn-primary rounded-lg shadow-sm"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                {/* Distance & Map Bar */}
                <div className="flex items-center justify-between mt-2 px-2">
                    {(() => {
                        const lastLocation = (() => {
                            const shotsWithLoc = score.approachShotsDetails?.filter(s => s.location);
                            if (shotsWithLoc && shotsWithLoc.length > 0) {
                                return shotsWithLoc[shotsWithLoc.length - 1].location;
                            }
                            return score.teeLocation;
                        })();

                        const dist = (hole.greenCenter && lastLocation)
                            ? calculateDistance(lastLocation, hole.greenCenter)
                            : null;

                        return (
                            <div className="flex items-center">
                                <span className="text-xs font-bold theme-text-secondary uppercase tracking-wider">To Green:</span>
                                {dist !== null ? (
                                    <span className="ml-2 text-lg font-black text-green-600 dark:text-green-400">{dist}y</span>
                                ) : (
                                    <span className="ml-2 text-xs font-bold text-gray-400">-</span>
                                )}
                            </div>
                        );
                    })()}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowHoleImage(true)}
                            className="p-2 theme-btn-primary rounded-lg shadow-sm active:scale-95 transition-transform"
                            title="View Hole Map"
                        >
                            <ImageIcon size={20} />
                        </button>
                    </div>
                </div>

                {/* Total Score Display */}
                <div className="flex flex-col items-center justify-center pt-2 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <div className={`text-6xl font-black ${totalScore === 0 ? 'text-gray-400' : 'theme-text-primary text-black'}`}>
                                {totalScore === 0 ? '-' : totalScore}
                            </div>
                            <div className="text-[10px] font-bold theme-text-secondary uppercase tracking-widest mt-1">Strokes</div>
                        </div>

                        <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                        <div className="flex flex-col items-center">
                            <div className={`text-6xl font-black ${relativeScore === 0 ? 'theme-text-accent-blue' : relativeScore < 0 ? 'theme-text-accent-red' : 'theme-text-primary'
                                }`}>
                                {relativeScore > 0 ? `+${relativeScore}` : relativeScore === 0 ? 'E' : relativeScore}
                            </div>
                            <div className="text-[10px] font-bold theme-text-secondary uppercase tracking-widest mt-1">To Par</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className={`grid grid-cols-1 gap-6 ${isReadOnly ? 'opacity-80' : ''}`}>

                    {/* Approach Section */}
                    <div className={`theme-card-approach rounded-2xl p-4 border-2 space-y-4`}>
                        <div className="text-center font-bold theme-text-approach uppercase tracking-wide">Approach</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('approach', -1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-approach rounded-full shadow-sm active:scale-95 transition-transform text-3xl font-bold disabled:opacity-50 disabled:active:scale-100"
                                disabled={isReadOnly || score.approachShots <= 0 || isLocating}
                            >
                                -
                            </button>
                            <span className="text-5xl font-black theme-text-approach w-20 text-center">{score.approachShots}</span>
                            <div className="flex items-center gap-2">
                                {!isReadOnly && selectedClub && selectedClub !== 'LostBall' && score.approachShots === 0 && hole.par >= 4 && (
                                    <button
                                        onClick={() => setFairwayHit(!fairwayHit)}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shadow-sm transition-all active:scale-95 ${fairwayHit
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-400'
                                            }`}
                                        title={fairwayHit ? 'Fairway hit' : 'Missed fairway (Rough / Penalty)'}
                                    >
                                        <Target size={20} className={fairwayHit ? '' : 'opacity-40'} />
                                        <span className="text-[8px] font-black mt-0.5 tracking-tighter leading-none">
                                            {fairwayHit ? 'FAIRWAY' : 'MISS'}
                                        </span>
                                    </button>
                                )}
                                {!isReadOnly && selectedClub && selectedClub !== 'LostBall' && (
                                    <button
                                        onClick={() => setIsRepresentative(!isRepresentative)}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shadow-sm transition-all active:scale-95 ${isRepresentative
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-400'
                                            }`}
                                        title={isRepresentative ? 'Representative shot for stats' : 'Exclude from stats (Bad shot / Recovery)'}
                                    >
                                        <BarChart2 size={20} className={isRepresentative ? '' : 'opacity-40'} />
                                        <span className="text-[8px] font-black mt-0.5 tracking-tighter leading-none">
                                            {isRepresentative ? 'STATS' : 'NO STATS'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={handleAddApproach}
                                    className={`w-16 h-16 flex items-center justify-center rounded-full shadow-md active:scale-95 transition-transform text-3xl font-bold border-2 ${selectedClub
                                        ? 'theme-btn-approach border-current'
                                        : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                        }`}
                                    disabled={isReadOnly || !selectedClub || isLocating}
                                >
                                    {isLocating ? <Loader2 className="animate-spin" size={24} /> : '+'}
                                </button>
                            </div>
                        </div>

                        {/* Club Selection Grid */}
                        {!isReadOnly && (
                            <div className="space-y-2 pt-2 border-t theme-border-approach opacity-90">
                                <p className="text-xs text-center theme-text-approach uppercase font-bold tracking-wider mb-2">Select Club</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {([...bagClubs, 'LostBall'] as GolfClub[]).map(club => (
                                        <button
                                            key={club}
                                            onClick={() => setSelectedClub(club)}
                                            className={`py-2 px-1 rounded-lg text-sm font-bold transition-all border-2 flex items-center justify-center ${selectedClub === club
                                                ? club === 'LostBall'
                                                    ? 'bg-red-100 text-red-600 border-red-500 ring-2 ring-offset-2 ring-red-200 scale-105'
                                                    : 'theme-btn-approach ring-2 ring-offset-2 ring-blue-400 scale-105'
                                                : club === 'LostBall'
                                                    ? 'bg-red-50 text-red-400 border-red-100 hover:border-red-300'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                                                }`}
                                            title={club === 'LostBall' ? "Lost Ball (Penalty)" : club}
                                        >
                                            {club === 'LostBall' ? <XCircle size={16} /> : club}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* 
                         No longer showing "Set Tee Location first" warning as it is auto-set
                        */}
                    </div>

                    {/* Putting Section */}
                    <div className="theme-card-putt rounded-2xl p-4 border-2">
                        <div className="text-center mb-4 font-bold theme-text-putt uppercase tracking-wide">Putting (Green)</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('putt', -1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-putt rounded-full shadow-sm active:scale-95 transition-transform text-3xl font-bold disabled:opacity-50 disabled:active:scale-100"
                                disabled={isReadOnly || score.putts <= 0}
                            >
                                -
                            </button>
                            <span className="text-5xl font-black theme-text-putt w-20 text-center">{score.putts}</span>
                            <button
                                onClick={() => onUpdateScore('putt', 1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-putt rounded-full shadow-md active:scale-95 transition-transform text-3xl font-bold disabled:opacity-50 disabled:active:scale-100"
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
                    <div className="flex justify-end p-4 shrink-0">
                        <button
                            onClick={() => setShowHoleImage(false)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        <img
                            src={`/fields/CdeC/hoyo-${hole.number}.jpg`}
                            alt={`Hole ${hole.number} Map`}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}

        </div>
    );
};
