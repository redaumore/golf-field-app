import React, { useState } from 'react';
import { X } from 'lucide-react';

interface StartingHoleModalProps {
    isOpen: boolean;
    onConfirm: (holeNumber: number) => void;
    onCancel: () => void;
}

export const StartingHoleModal: React.FC<StartingHoleModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
}) => {
    const [selectedHole, setSelectedHole] = useState<number>(1);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all animate-in zoom-in-95 duration-200 theme-bg-primary theme-text-primary border theme-border">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 theme-border-secondary">
                    <h3 className="text-xl font-bold">Select Starting Hole</h3>
                    <button
                        onClick={onCancel}
                        className="rounded-full p-2 hover:bg-black/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="mb-4 text-center text-sm theme-text-secondary">
                        Choose which hole you are starting your round on.
                    </p>

                    <div className="grid grid-cols-6 gap-2 mb-6">
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((num) => (
                            <button
                                key={num}
                                onClick={() => setSelectedHole(num)}
                                className={`aspect-square flex items-center justify-center rounded-lg font-bold text-lg transition-all ${selectedHole === num
                                        ? 'bg-blue-600 text-white shadow-md scale-105'
                                        : 'bg-gray-100 theme-bg-secondary theme-text-primary hover:bg-gray-200 border theme-border'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 rounded-xl px-4 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(selectedHole)}
                            className="flex-1 rounded-xl px-4 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors"
                        >
                            Start Round
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
