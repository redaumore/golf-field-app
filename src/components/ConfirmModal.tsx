import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmButtonClass?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    confirmButtonClass = 'bg-blue-600 text-white hover:bg-blue-700',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative theme-bg-primary rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1 theme-text-tertiary hover:theme-text-secondary transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="mb-6">
                    <h2 className="text-2xl font-black theme-text-primary mb-3">
                        {title}
                    </h2>
                    <p className="theme-text-secondary leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 theme-bg-tertiary theme-text-primary font-bold rounded-xl hover:theme-bg-secondary active:theme-bg-secondary transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 font-bold rounded-xl active:scale-95 transition-all ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
