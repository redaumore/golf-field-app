import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import type { GuestPlayer } from '../types';

interface StartingHoleModalProps {
    isOpen: boolean;
    onConfirm: (holeNumber: number, guests?: GuestPlayer[]) => void;
    onCancel: () => void;
}

export const StartingHoleModal: React.FC<StartingHoleModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
}) => {
    const [selectedHole, setSelectedHole] = useState<number>(1);
    const [guestCount, setGuestCount] = useState<number>(0);
    const [guestNames, setGuestNames] = useState<string[]>(['', '']);

    if (!isOpen) return null;

    const handleConfirm = () => {
        let guests: GuestPlayer[] | undefined = undefined;
        if (guestCount > 0) {
            guests = Array.from({ length: guestCount }, (_, i) => ({
                id: `guest-${i + 1}-${Date.now()}`,
                name: guestNames[i].trim() || `Invitado ${i + 1}`,
                scores: {},
            }));
        }
        onConfirm(selectedHole, guests);
    };

    const handleNameChange = (index: number, name: string) => {
        setGuestNames(prev => {
            const next = [...prev];
            next[index] = name;
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all animate-in zoom-in-95 duration-200 theme-bg-primary theme-text-primary border theme-border">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 theme-border-secondary shrink-0">
                    <h3 className="text-xl font-bold">Nueva Ronda</h3>
                    <button
                        onClick={onCancel}
                        className="rounded-full p-2 hover:bg-black/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-sm font-semibold theme-text-secondary mb-2 text-center">
                            Hoyo de Salida
                        </label>
                        <div className="grid grid-cols-6 gap-2">
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
                    </div>

                    {/* Guests selection */}
                    <div className="border-t pt-4 theme-border-secondary">
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={18} className="theme-text-secondary" />
                            <label className="text-sm font-semibold theme-text-secondary">
                                Invitados (opcional)
                            </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[0, 1, 2].map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    onClick={() => setGuestCount(count)}
                                    className={`py-2 px-3 rounded-lg font-semibold text-sm border transition-all ${guestCount === count
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-gray-100 theme-bg-secondary theme-text-primary border-transparent hover:bg-gray-200'
                                        }`}
                                >
                                    {count === 0 ? 'Solo yo' : `${count} ${count === 1 ? 'Invitado' : 'Invitados'}`}
                                </button>
                            ))}
                        </div>

                        {guestCount > 0 && (
                            <div className="space-y-2 mt-3">
                                {Array.from({ length: guestCount }).map((_, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        placeholder={`Nombre del Invitado ${idx + 1}`}
                                        value={guestNames[idx]}
                                        onChange={(e) => handleNameChange(idx, e.target.value)}
                                        className="w-full p-2.5 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t theme-border-secondary shrink-0 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-xl px-4 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 rounded-xl px-4 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors"
                    >
                        Iniciar Ronda
                    </button>
                </div>
            </div>
        </div>
    );
};

