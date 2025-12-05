import React, { useState } from 'react';
import type { Hole, HoleScore } from '../types';
import { ChevronLeft, ChevronRight, List, MapPin, Flag, Home, CheckCircle } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ThemeToggle } from './ThemeToggle';
import { APP_VERSION } from '../constants/version';

interface HoleViewProps {
    hole: Hole;
    score: HoleScore;
    onUpdateScore: (type: 'approach' | 'putt', delta: number) => void;
    onNext: () => void;
    onPrev: () => void;
    onShowScorecard: () => void;
    onBackToRounds: () => void;
    onFinishRound: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export const HoleView: React.FC<HoleViewProps> = ({
    hole,
    score,
    onUpdateScore,
    onNext,
    onPrev,
    onShowScorecard,
    onBackToRounds,
    onFinishRound,
    isFirst,
    isLast,
}) => {
    const [showFinishModal, setShowFinishModal] = useState(false);
    const totalScore = score.approachShots + score.putts;
    const scoreDiff = totalScore - hole.par;

    const getScoreColor = () => {
        if (totalScore === 0) return 'text-gray-400';
        if (scoreDiff < 0) return 'text-red-600';
        if (scoreDiff === 0) return 'text-blue-600';
        return 'text-black';
    };

    return (
        <div className="flex flex-col min-h-screen theme-bg-primary theme-text-primary">
            {/* Header */}
            <div className="flex items-center justify-between p-4 theme-bg-secondary theme-border border-b">
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
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="p-2 theme-accent-green rounded-lg shadow-sm border-2"
                        title="Finish Round"
                    >
                        <CheckCircle size={20} />
                    </button>
                    <button
                        onClick={onShowScorecard}
                        className="p-3 theme-btn-primary rounded-lg shadow-sm"
                    >
                        <List size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4 space-y-6 pb-6">

                {/* Total Score Display */}
                <div className="flex flex-col items-center justify-center py-4">
                    <div className={`text-6xl font-black ${getScoreColor()}`}>
                        {totalScore === 0 ? '-' : totalScore}
                    </div>
                    <div className="text-sm font-bold theme-text-secondary uppercase tracking-widest mt-2">Total Strokes</div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 gap-6">

                    {/* Approach Section */}
                    <div className="theme-card-approach rounded-2xl p-4 border-2">
                        <div className="text-center mb-4 font-bold theme-text-approach uppercase tracking-wide">Approach</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('approach', -1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-approach rounded-full shadow-sm active:scale-95 transition-transform text-3xl font-bold"
                                disabled={score.approachShots <= 0}
                            >
                                -
                            </button>
                            <span className="text-5xl font-black theme-text-approach w-20 text-center">{score.approachShots}</span>
                            <button
                                onClick={() => onUpdateScore('approach', 1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-approach rounded-full shadow-md active:scale-95 transition-transform text-3xl font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Putting Section */}
                    <div className="theme-card-putt rounded-2xl p-4 border-2">
                        <div className="text-center mb-4 font-bold theme-text-putt uppercase tracking-wide">Putting (Green)</div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onUpdateScore('putt', -1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-putt rounded-full shadow-sm active:scale-95 transition-transform text-3xl font-bold"
                                disabled={score.putts <= 0}
                            >
                                -
                            </button>
                            <span className="text-5xl font-black theme-text-putt w-20 text-center">{score.putts}</span>
                            <button
                                onClick={() => onUpdateScore('putt', 1)}
                                className="w-16 h-16 flex items-center justify-center theme-btn-putt rounded-full shadow-md active:scale-95 transition-transform text-3xl font-bold"
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
                    onClick={onNext}
                    disabled={isLast}
                    className={`flex items-center justify-center p-4 rounded-xl font-bold text-lg transition-colors border-2 ${isLast
                        ? 'theme-bg-tertiary theme-text-tertiary border-transparent'
                        : 'theme-bg-primary theme-text-primary theme-border active:brightness-90'
                        }`}
                >
                    Next <ChevronRight className="ml-2" />
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
