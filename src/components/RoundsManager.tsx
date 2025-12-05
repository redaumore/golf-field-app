import React, { useState } from 'react';
import type { RoundMetadata } from '../types';
import { Plus, Trash2, Eye, Calendar } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ThemeToggle } from './ThemeToggle';
import { APP_VERSION } from '../constants/version';

interface RoundsManagerProps {
    rounds: RoundMetadata[];
    onCreateRound: () => void;
    onSelectRound: (roundId: string) => void;
    onDeleteRound: (roundId: string) => void;
}

export const RoundsManager: React.FC<RoundsManagerProps> = ({
    rounds,
    onCreateRound,
    onSelectRound,
    onDeleteRound,
}) => {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [roundToDelete, setRoundToDelete] = useState<{ id: string; date: Date } | null>(null);
    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const sortedRounds = [...rounds].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="flex flex-col min-h-screen theme-bg-primary theme-text-primary">
            {/* Header */}
            <div className="relative p-4 theme-bg-secondary theme-border border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black">Golf Rounds</h1>
                        <p className="text-sm theme-text-secondary mt-1">Manage your golf game history</p>
                    </div>
                    <ThemeToggle />
                </div>
                {/* Version indicator */}
                <span className="absolute top-2 right-2 text-[10px] theme-text-tertiary font-mono">
                    v{APP_VERSION}
                </span>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 space-y-4">
                {/* Create New Round Button */}
                <button
                    onClick={onCreateRound}
                    className="w-full flex items-center justify-center gap-3 p-6 bg-black text-white rounded-2xl font-bold text-lg shadow-md active:bg-gray-800 transition-colors"
                >
                    <Plus size={24} />
                    Start New Round
                </button>

                {/* Rounds List */}
                {sortedRounds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Calendar size={64} className="mb-4 opacity-50" />
                        <p className="text-lg font-semibold">No rounds yet</p>
                        <p className="text-sm">Start your first round to begin tracking</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Your Rounds</h2>
                        {sortedRounds.map((round) => (
                            <div
                                key={round.id}
                                className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-100 shadow-sm"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-lg font-black">{formatDate(round.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="font-bold text-blue-600">
                                                Score: {round.totalScore || '-'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${round.isComplete
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {round.isComplete ? 'Complete' : 'In Progress'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onSelectRound(round.id)}
                                        className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm active:bg-blue-700 transition-colors"
                                    >
                                        <Eye size={18} />
                                        {round.isComplete ? 'View' : 'Continue'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRoundToDelete({ id: round.id, date: round.date });
                                            setDeleteModalOpen(true);
                                        }}
                                        className="p-3 bg-red-50 text-red-600 rounded-xl font-bold shadow-sm active:bg-red-100 transition-colors border-2 border-red-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Round Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete Round?"
                message={roundToDelete ? `Are you sure you want to delete the round from ${formatDate(roundToDelete.date)}? This action cannot be undone.` : ''}
                confirmText="Delete"
                cancelText="Cancel"
                confirmButtonClass="bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
                onConfirm={() => {
                    if (roundToDelete) {
                        onDeleteRound(roundToDelete.id);
                    }
                    setDeleteModalOpen(false);
                    setRoundToDelete(null);
                }}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setRoundToDelete(null);
                }}
            />
        </div>
    );
};
