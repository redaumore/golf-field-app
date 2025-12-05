import React from 'react';
import { Sun, Contrast } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'modern' ? 'Switch to High Contrast' : 'Switch to Modern'}
        >
            {theme === 'modern' ? (
                <Contrast size={20} />
            ) : (
                <Sun size={20} />
            )}
        </button>
    );
};
