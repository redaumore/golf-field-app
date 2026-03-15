import React, { useState, useEffect } from 'react';
import { Menu, Plus, Save, RotateCcw, Trash2 } from 'lucide-react';
import type { DrivingSession, DrivingShot } from '../types';
import { saveDrivingSessionToGoogleSheets, deleteDrivingSessionFromGoogleSheets } from '../services/googleSheetsService';
import { ConfirmModal } from './ConfirmModal';

interface DrivingRangeProps {
    onMenuClick: () => void;
}

export const DrivingRange: React.FC<DrivingRangeProps> = ({ onMenuClick }) => {
    const [session, setSession] = useState<DrivingSession | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sessions, setSessions] = useState<DrivingSession[]>([]);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

    const handleDiscardSession = () => {
        if (!session) return;
        const newSessions = sessions.filter(s => s.id !== session.id);
        setSessions(newSessions);
        saveToLocal(newSessions);
        setSession(null);
        setShowDiscardModal(false);
    };

    // Try to load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('golf-app-driving-sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved).map((s: any) => ({
                    ...s,
                    date: new Date(s.date)
                }));
                // Find unfinished session
                const active = parsed.find((s: DrivingSession) => !s.isFinished);
                if (active) setSession(active);
                setSessions(parsed);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const saveToLocal = (newSessions: DrivingSession[]) => {
        localStorage.setItem('golf-app-driving-sessions', JSON.stringify(newSessions));
    };

    const handleStartSession = (club: DrivingSession['club']) => {
        const newSession: DrivingSession = {
            id: `drv-${Date.now()}`,
            date: new Date(),
            club,
            shots: [],
            isFinished: false
        };
        setSession(newSession);
        
        const newSessions = [...sessions, newSession];
        setSessions(newSessions);
        saveToLocal(newSessions);
    };

    const handleAddShot = (direction: DrivingShot['direction']) => {
        if (!session) return;
        
        const shot: DrivingShot = {
            id: `shot-${Date.now()}`,
            timestamp: Date.now(),
            direction
        };

        const updatedSession = {
            ...session,
            shots: [...session.shots, shot]
        };

        setSession(updatedSession);
        
        const newSessions = sessions.map(s => s.id === session.id ? updatedSession : s);
        setSessions(newSessions);
        saveToLocal(newSessions);
    };

    const handleUndoLast = () => {
        if (!session || session.shots.length === 0) return;
        
        const updatedSession = {
            ...session,
            shots: session.shots.slice(0, -1)
        };

        setSession(updatedSession);
        const newSessions = sessions.map(s => s.id === session.id ? updatedSession : s);
        setSessions(newSessions);
        saveToLocal(newSessions);
    };

    const handleFinishSession = async () => {
        if (!session) return;

        setIsSaving(true);
        const finishedSession = { ...session, isFinished: true };
        
        try {
            await saveDrivingSessionToGoogleSheets(finishedSession);
            setSession(null);
            
            const newSessions = sessions.map(s => s.id === session.id ? finishedSession : s);
            setSessions(newSessions);
            saveToLocal(newSessions);
            
            setAlertMessage({ title: 'Success', message: 'Session saved successfully!', type: 'success' });
        } catch (error) {
            console.error('Failed to save to sheets', error);
            setAlertMessage({ title: 'Warning', message: 'Failed to save to Google Sheets. Will try again later.', type: 'error' });
            // Still mark as finished locally
            setSession(null);
            const newSessions = sessions.map(s => s.id === session.id ? finishedSession : s);
            setSessions(newSessions);
            saveToLocal(newSessions);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSavedSession = async () => {
        if (!sessionToDelete) return;
        
        try {
            await deleteDrivingSessionFromGoogleSheets(sessionToDelete);
            
            const newSessions = sessions.filter(s => s.id !== sessionToDelete);
            setSessions(newSessions);
            saveToLocal(newSessions);
        } catch (error) {
            console.error('Failed to delete from sheets', error);
            setAlertMessage({ title: 'Error', message: 'Failed to delete from Google Sheets. Try again later.', type: 'error' });
        } finally {
            setSessionToDelete(null);
        }
    };

    if (!session) {
        return (
            <div className="flex flex-col h-screen theme-bg-primary theme-text-primary p-4 animate-fade-in relative">
                <div className="flex justify-between items-center top-0 pt-4 pb-2 z-10 sticky theme-bg-primary">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black">Driving Range</h1>
                        <p className="text-sm theme-text-secondary mt-1">Track your shot direction</p>
                    </div>
                    <button onClick={onMenuClick} className="p-3 theme-btn-primary rounded-lg shadow-sm">
                        <Menu size={24} />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm mb-8">
                        <h2 className="text-xl font-bold mb-4 text-center">Start New Session</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {(['Driver', 'Wood', 'Long Iron', 'Short Iron'] as const).map(club => (
                                <button
                                    key={club}
                                    onClick={() => handleStartSession(club)}
                                    className="flex flex-col items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl shadow-md active:scale-95 transition-transform"
                                >
                                    <Plus size={24} />
                                    <span className="font-bold text-sm">{club}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-8 w-full max-w-sm">
                        <h3 className="font-bold mb-4">Recent Sessions</h3>
                        {sessions.filter(s => s.isFinished).slice(-3).reverse().map(s => {
                            const sessionTotal = s.shots.length;
                            const successful = s.shots.filter(shot => shot.direction === 'center').length;
                            const acceptable = s.shots.filter(shot => shot.direction === 'left' || shot.direction === 'right').length;
                            const missed = s.shots.filter(shot => shot.direction === 'far-left' || shot.direction === 'far-right').length;
                            
                            const successfulPct = sessionTotal > 0 ? Math.round((successful / sessionTotal) * 100) : 0;
                            const acceptablePct = sessionTotal > 0 ? Math.round((acceptable / sessionTotal) * 100) : 0;
                            const missedPct = sessionTotal > 0 ? Math.round((missed / sessionTotal) * 100) : 0;

                            return (
                                <div key={s.id} className="p-4 border rounded-xl mb-3 theme-border theme-bg-secondary group">
                                    <div className="flex justify-between items-center font-bold mb-1">
                                        <span>{new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        <div className="flex items-center gap-2">
                                            <span>{sessionTotal} shots</span>
                                            <button 
                                                onClick={() => setSessionToDelete(s.id)}
                                                className="p-1.5 theme-btn-primary text-red-500 dark:text-red-400 rounded-lg shadow-sm transition-colors active:scale-95"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3">{s.club}</div>
                                    
                                    {sessionTotal > 0 && (
                                        <>
                                            <div className="flex w-full h-2 rounded-full overflow-hidden mb-2 gap-0.5">
                                                {successfulPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${successfulPct}%` }}></div>}
                                                {acceptablePct > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${acceptablePct}%` }}></div>}
                                                {missedPct > 0 && <div className="bg-red-500 h-full" style={{ width: `${missedPct}%` }}></div>}
                                            </div>
                                            <div className="flex justify-between text-xs font-bold mt-1">
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <span>✓</span> {successfulPct}%
                                                </div>
                                                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                                    <span>~</span> {acceptablePct}%
                                                </div>
                                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <span>✕</span> {missedPct}%
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <ConfirmModal
                    isOpen={!!sessionToDelete}
                    title="Delete Saved Session"
                    message="Are you sure you want to permanently delete this practice session from your history and Google Sheets?"
                    confirmText="Delete"
                    cancelText="Cancel"
                    confirmButtonClass="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    onConfirm={handleDeleteSavedSession}
                    onCancel={() => setSessionToDelete(null)}
                />
                <ConfirmModal
                    isOpen={!!alertMessage}
                    title={alertMessage?.title || ''}
                    message={alertMessage?.message || ''}
                    confirmText="OK"
                    showCancel={false}
                    confirmButtonClass={alertMessage?.type === 'error' ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700' : 'theme-btn-primary'}
                    onConfirm={() => setAlertMessage(null)}
                    onCancel={() => setAlertMessage(null)}
                />
            </div>
        );
    }

    const { shots } = session;
    const total = shots.length;
    const center = shots.filter(s => s.direction === 'center').length;
    const left = shots.filter(s => s.direction === 'left').length;
    const right = shots.filter(s => s.direction === 'right').length;
    const farLeft = shots.filter(s => s.direction === 'far-left').length;
    const farRight = shots.filter(s => s.direction === 'far-right').length;

    const successful = center;
    const acceptable = left + right;
    const unacceptable = farLeft + farRight;

    const successfulPct = total > 0 ? Math.round((successful / total) * 100) : 0;
    const acceptablePct = total > 0 ? Math.round((acceptable / total) * 100) : 0;
    const unacceptablePct = total > 0 ? Math.round((unacceptable / total) * 100) : 0;
    
    // Deviation calculation
    const leftTotal = left + farLeft;
    const rightTotal = right + farRight;
    
    const leftPct = total > 0 ? Math.round((leftTotal / total) * 100) : 0;
    const rightPct = total > 0 ? Math.round((rightTotal / total) * 100) : 0;

    return (
        <div className="flex flex-col min-h-screen theme-bg-primary theme-text-primary p-4 animate-fade-in relative">
            <div className="flex justify-between items-center top-0 pt-4 pb-2 z-10 sticky theme-bg-primary">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400">{session.club}</h1>
                    <p className="text-sm theme-text-secondary font-bold tracking-wider uppercase mt-1">
                        Driving Practice • {total} Shots
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowDiscardModal(true)} 
                        className="p-3 theme-btn-primary text-red-500 dark:text-red-400 rounded-lg shadow-sm"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button 
                        onClick={handleUndoLast} 
                        disabled={total === 0}
                        className="p-3 theme-btn-primary rounded-lg shadow-sm disabled:opacity-50"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={onMenuClick} className="p-3 theme-btn-primary rounded-lg shadow-sm">
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-8">
                
                {/* Stats Panel */}
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 theme-bg-secondary rounded-xl border border-green-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-green-500/5"></div>
                            <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider z-10">Success</span>
                            <span className="text-2xl font-black text-green-600 dark:text-green-400 z-10">{successfulPct}%</span>
                        </div>
                        <div className="p-3 theme-bg-secondary rounded-xl border border-yellow-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-yellow-500/5"></div>
                            <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider z-10">Acceptable</span>
                            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400 z-10">{acceptablePct}%</span>
                        </div>
                        <div className="p-3 theme-bg-secondary rounded-xl border border-red-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5"></div>
                            <span className="text-[10px] theme-text-secondary font-bold uppercase tracking-wider z-10">Missed</span>
                            <span className="text-2xl font-black text-red-600 dark:text-red-400 z-10">{unacceptablePct}%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 theme-bg-secondary rounded-xl border theme-border flex flex-col items-center justify-center">
                            <span className="text-[9px] theme-text-secondary font-bold uppercase tracking-wider text-center">Left</span>
                            <span className="text-xl font-black">{leftPct}%</span>
                        </div>
                        <div className="p-3 theme-bg-secondary rounded-xl border theme-border flex flex-col items-center justify-center">
                            <span className="text-[9px] theme-text-secondary font-bold uppercase tracking-wider text-center">Total Shots</span>
                            <span className="text-xl font-black">{total}</span>
                        </div>
                        <div className="p-3 theme-bg-secondary rounded-xl border theme-border flex flex-col items-center justify-center">
                            <span className="text-[9px] theme-text-secondary font-bold uppercase tracking-wider text-center">Right</span>
                            <span className="text-xl font-black">{rightPct}%</span>
                        </div>
                    </div>
                </div>

                {/* Input Controls matching the image style */}
                <div className="flex flex-col gap-6 mt-4">
                    <p className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm">Log Previous Shot</p>
                    
                    <div className="flex justify-center items-center gap-2 h-48 px-2">
                        {/* Far Left - Red */}
                        <button 
                            onClick={() => handleAddShot('far-left')}
                            className="flex-1 h-3/4 bg-red-400/80 active:bg-red-500 rounded-l-[50px] rounded-r-lg shadow-inner active:scale-95 transition-all text-white font-black text-lg"
                        >
                            {farLeft > 0 && farLeft}
                        </button>

                        {/* Left - Yellow */}
                        <button 
                            onClick={() => handleAddShot('left')}
                            className="flex-1 h-5/6 bg-yellow-400/80 active:bg-yellow-500 rounded-xl shadow-inner active:scale-95 transition-all text-white font-black text-2xl"
                        >
                            {left > 0 && left}
                        </button>

                        {/* Center - Green */}
                        <button 
                            onClick={() => handleAddShot('center')}
                            className="w-24 h-full bg-green-500/90 active:bg-green-600 rounded-[50px] shadow-lg active:scale-95 transition-all text-white font-black text-4xl border-4 border-green-600/30"
                        >
                            {center > 0 && center}
                        </button>

                        {/* Right - Yellow */}
                        <button 
                            onClick={() => handleAddShot('right')}
                            className="flex-1 h-5/6 bg-yellow-400/80 active:bg-yellow-500 rounded-xl shadow-inner active:scale-95 transition-all text-white font-black text-2xl"
                        >
                            {right > 0 && right}
                        </button>

                        {/* Far Right - Red */}
                        <button 
                            onClick={() => handleAddShot('far-right')}
                            className="flex-1 h-3/4 bg-red-400/80 active:bg-red-500 rounded-r-[50px] rounded-l-lg shadow-inner active:scale-95 transition-all text-white font-black text-lg"
                        >
                            {farRight > 0 && farRight}
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleFinishSession}
                    disabled={isSaving || total === 0}
                    className="mt-8 flex items-center justify-center gap-2 w-full p-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg disabled:opacity-50"
                >
                    {isSaving ? (
                        <>Saving...</>
                    ) : (
                        <>
                            <Save size={20} />
                            Finish & Save Session
                        </>
                    )}
                </button>
            </div>
            <ConfirmModal
                isOpen={showDiscardModal}
                title="Discard Session"
                message="Are you sure you want to discard this practice session? These shots will be permanently deleted and nothing will be saved."
                confirmText="Discard Session"
                cancelText="Keep Playing"
                confirmButtonClass="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                onConfirm={handleDiscardSession}
                onCancel={() => setShowDiscardModal(false)}
            />
        </div>
    );
};
