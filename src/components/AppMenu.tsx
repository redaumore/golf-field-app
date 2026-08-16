import React from 'react';
import { Home, X, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AppMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToRounds: () => void;
    onNavigateToDriving: () => void;
    onNavigateToProfile: () => void;
}

export const AppMenu: React.FC<AppMenuProps> = ({
    isOpen,
    onClose,
    onNavigateToRounds,
    onNavigateToDriving,
    onNavigateToProfile
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

                <button
                    onClick={() => {
                        onClose();
                        onNavigateToDriving();
                    }}
                    className="flex items-center gap-4 w-full p-4 theme-bg-secondary rounded-xl font-bold border theme-border hover:brightness-95 active:scale-95 transition-all text-left"
                >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                    </div>
                    <span className="text-lg">Driving Range</span>
                </button>

                <button
                    onClick={() => {
                        onClose();
                        onNavigateToProfile();
                    }}
                    className="flex items-center gap-4 w-full p-4 theme-bg-secondary rounded-xl font-bold border theme-border hover:brightness-95 active:scale-95 transition-all text-left"
                >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <User size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-lg">Perfil</span>
                </button>


                <div className="flex items-center justify-between p-4 theme-bg-secondary rounded-xl border theme-border mt-2">
                    <span className="font-bold text-lg">Dark Mode</span>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
};
