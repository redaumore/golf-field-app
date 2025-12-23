import { useState } from 'react';
import type { Hole, HoleScore, GolfClub, GeoLocation } from '../types';
import { ChevronLeft, ChevronRight, List, MapPin, Flag, Home, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ThemeToggle } from './ThemeToggle';
import { APP_VERSION } from '../constants/version';

interface HoleViewProps {
    hole: Hole;
    score: HoleScore;
    onUpdateScore: (type: 'approach' | 'putt', delta: number, club?: GolfClub, location?: GeoLocation) => void;
    onNext: () => void;
    onPrev: () => void;
    onShowScorecard: () => void;
    onBackToRounds: () => void;
    onFinishRound: () => void;
    onSetTeeLocation: (location: GeoLocation) => void;
    isFirst: boolean;
    isLast: boolean;
    isReadOnly?: boolean;
}

const CLUBS: GolfClub[] = ['1w', '3w', '4i', '5i', '6i', '7i', '8i', '9i', 'Pw', 'Sd', '60', 'LostBall'];

export const HoleView: React.FC<HoleViewProps> = ({
    hole,
    score,
    onUpdateScore,
    onNext,
    onPrev,
    onShowScorecard,
    onBackToRounds,
    onFinishRound,
    onSetTeeLocation,
    isFirst,
    isLast,
    isReadOnly = false,
}) => {
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [selectedClub, setSelectedClub] = useState<GolfClub | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isSettingTee, setIsSettingTee] = useState(false);

    const totalScore = score.approachShots + score.putts;
    const scoreDiff = totalScore - hole.par;

    const getScoreColor = () => {
        if (totalScore === 0) return 'text-gray-400';
        if (scoreDiff < 0) return 'text-red-600';
        if (scoreDiff === 0) return 'text-blue-600';
        return 'theme-text-primary text-black';
    };

    const handleSetTee = () => {
        if (!navigator.geolocation) return;
        setIsSettingTee(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onSetTeeLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setIsSettingTee(false);
            },
            (error) => {
                console.warn("Tee location error:", error);
                setIsSettingTee(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleAddApproach = () => {
        if (!selectedClub) return;

        // Special handling for Lost Ball: No geolocation needed
        if (selectedClub === 'LostBall') {
            onUpdateScore('approach', 1, selectedClub);
            setSelectedClub(null);
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
                    });
                    setSelectedClub(null);
                    setIsLocating(false);
                },
                (error) => {
                    console.warn("Geolocation error:", error);
                    // Fallback without location if error occurs
                    onUpdateScore('approach', 1, selectedClub);
                    setSelectedClub(null);
                    setIsLocating(false);
                },
                // High accuracy for golf course precision
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            // Fallback for browsers without geolocation
            onUpdateScore('approach', 1, selectedClub);
            setSelectedClub(null);
            setIsLocating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full theme-bg-primary theme-text-primary fixed inset-0">
            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-4 theme-bg-secondary theme-border border-b shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBackToRounds}
                        className="p-2 theme-btn-primary rounded-lg shadow-sm"
                    >
                        <Home size={20} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black">Hole {hole.number}</h1>
                        <div className="flex items-center space-x-3 text-sm font-bold theme-text-secondary mt-1">
                            <span className="flex items-center"><Flag size={14} className="mr-1" /> Par {hole.par}</span>
                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {hole.distance}y</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {!isReadOnly && (
                        <button
                            onClick={() => setShowFinishModal(true)}
                            className="p-2 theme-accent-green rounded-lg shadow-sm border-2"
                            title="Finish Round"
                        >
                            <CheckCircle size={20} />
                        </button>
                    )}
                    <button
                        onClick={onShowScorecard}
                        className="p-3 theme-btn-primary rounded-lg shadow-sm"
                    >
                        <List size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">

                {/* Total Score Display */}
                <div className="flex flex-col items-center justify-center pt-2 pb-4">
                    <div className={`text-6xl font-black ${getScoreColor()}`}>
                        {totalScore === 0 ? '-' : totalScore}
                    </div>
                    <div className="text-sm font-bold theme-text-secondary uppercase tracking-widest mt-1 mb-4">Total Strokes</div>

                    {/* Prominent Tee Location Button */}
                    {!isReadOnly && (
                        <button
                            onClick={handleSetTee}
                            disabled={isSettingTee}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold shadow-md transition-all transform active:scale-95 ${score.teeLocation
                                ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                : 'bg-blue-600 text-white shadow-blue-200 shadow-lg animate-pulse'
                                }`}
                        >
                            {isSettingTee ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Locating...</span>
                                </>
                            ) : score.teeLocation ? (
                                <>
                                    <MapPin size={18} className="fill-current" />
                                    <span>Tee Location Set</span>
                                    <span className="text-xs opacity-75 font-mono ml-1">
                                        ({score.teeLocation.latitude.toFixed(4)})
                                    </span>
                                </>
                            ) : (
                                <>
                                    <MapPin size={20} />
                                    <span>START HOLE (SET TEE)</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Controls */}
                <div className={`grid grid-cols-1 gap-6 ${isReadOnly ? 'opacity-80' : ''}`}>

                    {/* Approach Section */}
                    <div className={`theme-card-approach rounded-2xl p-4 border-2 space-y-4 transition-opacity ${!score.teeLocation && !isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            <button
                                onClick={handleAddApproach}
                                className={`w-16 h-16 flex items-center justify-center rounded-full shadow-md active:scale-95 transition-transform text-3xl font-bold border-2 ${selectedClub
                                    ? 'theme-btn-approach border-current'
                                    : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                    }`}
                                disabled={isReadOnly || !selectedClub || isLocating || !score.teeLocation}
                            >
                                {isLocating ? <Loader2 className="animate-spin" size={24} /> : '+'}
                            </button>
                        </div>

                        {/* Club Selection Grid */}
                        {!isReadOnly && (
                            <div className="space-y-2 pt-2 border-t theme-border-approach opacity-90">
                                <p className="text-xs text-center theme-text-approach uppercase font-bold tracking-wider mb-2">Select Club</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {CLUBS.map(club => (
                                        <button
                                            key={club}
                                            onClick={() => setSelectedClub(club)}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border-2 flex items-center justify-center ${selectedClub === club
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
                        {!score.teeLocation && !isReadOnly && (
                            <div className="text-center text-xs text-red-500 font-bold uppercase tracking-wide mt-2">
                                Set Tee Location first
                            </div>
                        )}
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
        </div>
    );
};
