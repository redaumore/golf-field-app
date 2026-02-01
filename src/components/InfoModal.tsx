import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface InfoModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
    buttonText?: string;
    type?: 'success' | 'error' | 'info';
}

export const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    title,
    message,
    onClose,
    buttonText = 'OK',
    type = 'info',
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="text-green-500 mb-2" size={48} />;
            case 'error':
                return <AlertCircle className="text-red-500 mb-2" size={48} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative theme-bg-primary rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in flex flex-col items-center text-center">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 theme-text-tertiary hover:theme-text-secondary transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="mb-6 flex flex-col items-center">
                    {getIcon()}
                    <h2 className="text-2xl font-black theme-text-primary mb-2">
                        {title}
                    </h2>
                    <p className="theme-text-secondary leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <button
                    onClick={onClose}
                    className="w-full px-4 py-3 theme-btn-primary font-bold rounded-xl active:scale-95 transition-all shadow-md"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};
