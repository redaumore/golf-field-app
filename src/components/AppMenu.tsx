import React from 'react';
import { Home, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AppMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToRounds: () => void;
}

export const AppMenu: React.FC<AppMenuProps> = ({
    isOpen,
    onClose,
    onNavigateToRounds
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex bg-black/50 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="ml-auto h-full w-72 theme-bg-primary theme-text-primary shadow-2xl p-4 flex flex-col gap-4 animate-slide-in-right border-l theme-border"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2 pb-4 border-b theme-border">
                    <span className="font-black text-xl">Menu</span>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <button
                    onClick={() => {
                        onClose();
                        onNavigateToRounds();
                    }}
                    className="flex items-center gap-4 w-full p-4 theme-bg-secondary rounded-xl font-bold border theme-border hover:brightness-95 active:scale-95 transition-all text-left"
                >
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                        <Home size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-lg">Golf Rounds</span>
                </button>


                <div className="flex items-center justify-between p-4 theme-bg-secondary rounded-xl border theme-border mt-2">
                    <span className="font-bold text-lg">Dark Mode</span>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
};
