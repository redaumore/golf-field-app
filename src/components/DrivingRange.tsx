import React, { useState, useEffect } from 'react';
import { Menu, Plus, Save, RotateCcw, Trash2 } from 'lucide-react';
import type { DrivingSession, DrivingShot } from '../types';
import { saveDrivingSessionToGoogleSheets, deleteDrivingSessionFromGoogleSheets, fetchDrivingSessionsFromGoogleSheets } from '../services/googleSheetsService';
import { ConfirmModal } from './ConfirmModal';

interface DrivingRangeProps {
    onMenuClick: () => void;
}

export const DrivingRange: React.FC<DrivingRangeProps> = ({ onMenuClick }) => {
    const [session, setSession] = useState<DrivingSession | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sessions, setSessions] = useState<DrivingSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [alertMessage, setAlertMessage] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
    const [isProcessingShot, setIsProcessingShot] = useState(false);

    const PAGE_SIZE = 20;

    const handleDiscardSession = () => {
        if (!session) return;
        const newSessions = sessions.filter(s => s.id !== session.id);
        setSessions(newSessions);
        saveToLocal(newSessions);
        setSession(null);
        setShowDiscardModal(false);
    };

    // Load sessions: merge remote (Google Sheets) with local (localStorage)
    useEffect(() => {
        const loadSessions = async () => {
            setIsLoadingSessions(true);

            // 1. Read local sessions first (for immediate UI and to preserve in-progress sessions)
            let localSessions: DrivingSession[] = [];
            const saved = localStorage.getItem('golf-app-driving-sessions');
            if (saved) {
                try {
                    localSessions = JSON.parse(saved).map((s: any) => ({
                        ...s,
                        date: new Date(s.date)
                    }));
                } catch (e) {
                    console.error('Error parsing local sessions:', e);
                }
            }

            // Restore any active (unfinished) session immediately
            const activeLocal = localSessions.find((s: DrivingSession) => !s.isFinished);
            if (activeLocal) setSession(activeLocal);
            setSessions(localSessions);

            // 2. Fetch remote sessions from Google Sheets (initial batch)
            try {
                const remoteBatch = await fetchDrivingSessionsFromGoogleSheets(PAGE_SIZE, 0);
                
                if (remoteBatch.length < PAGE_SIZE) {
                    setHasMore(false);
                }

                // 3. Merge: remote sessions are the source of truth for finished sessions.
                const localUnfinished = localSessions.filter((s: DrivingSession) => !s.isFinished);
                const remoteMap = new Map(remoteBatch.map(s => [s.id, s]));
                
                // Add any local finished sessions that don't exist remotely yet
                const localFinishedNotInRemote = localSessions.filter(
                    (s: DrivingSession) => s.isFinished && !remoteMap.has(s.id)
                );

                const merged = [...remoteBatch, ...localFinishedNotInRemote, ...localUnfinished];
                const seen = new Set<string>();
                const deduped = merged.filter(s => {
                    if (seen.has(s.id)) return false;
                    seen.add(s.id);
                    return true;
                });

                setSessions(deduped);
                saveToLocal(deduped);
            } catch (error) {
                console.error('Could not fetch sessions from Google Sheets, using local data only:', error);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        loadSessions();
    }, []);

    const handleLoadMore = async (): Promise<DrivingSession[]> => {
        if (isLoadingMore || !hasMore) return sessions;
        
        setIsLoadingMore(true);
        try {
            // Actually, the IDs in Google Sheets are whatever they were saved as.
            // Let's just use the current count of finished sessions as a hint for offset.
            const finishedCount = sessions.filter(s => s.isFinished).length;
            
            const nextBatch = await fetchDrivingSessionsFromGoogleSheets(PAGE_SIZE, finishedCount);
            
            if (nextBatch.length < PAGE_SIZE) {
                setHasMore(false);
            }

            if (nextBatch.length > 0) {
                const updatedSessions = [...sessions, ...nextBatch];
                const seen = new Set<string>();
                const deduped = updatedSessions.filter(s => {
                    if (seen.has(s.id)) return false;
                    seen.add(s.id);
                    return true;
                });
                setSessions(deduped);
                return deduped;
            }
            return sessions;
        } catch (error) {
            console.error('Error loading more sessions:', error);
            return sessions;
        } finally {
            setIsLoadingMore(false);
        }
    };

    const groupSessionsByDay = (sessions: DrivingSession[]) => {
        const finishedSessions = sessions.filter(s => s.isFinished);
        const groups: { [key: string]: DrivingSession[] } = {};
        
        finishedSessions.forEach(s => {
            const date = new Date(s.date);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(s);
        });
        
        const sortedGroups = Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, groupSessions]) => ({
                date,
                sessions: groupSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            }));
            
        return sortedGroups;
    };

    const groupedData = groupSessionsByDay(sessions);
    const currentDayGroup = groupedData[currentDayIndex];

    const handleNextDay = () => {
        if (currentDayIndex > 0) {
            setCurrentDayIndex(currentDayIndex - 1);
        }
    };

    const handlePrevDay = async () => {
        if (currentDayIndex < groupedData.length - 1) {
            setCurrentDayIndex(currentDayIndex + 1);
        } else if (hasMore) {
            // Need to load more to see if there's another day
            const updated = await handleLoadMore();
            const newGrouped = groupSessionsByDay(updated);
            if (newGrouped.length > groupedData.length) {
                setCurrentDayIndex(currentDayIndex + 1);
            }
        }
    };

    const handleFirstDay = () => {
        setCurrentDayIndex(0);
    };

    const handleLastDay = async () => {
        if (!hasMore) {
            setCurrentDayIndex(groupedData.length - 1);
            return;
        }

        setIsLoadingMore(true);
        try {
            let currentSessions = [...sessions];
            let moreData = true;
            // Use the number of remote sessions we currently have as the base offset
            // remoteBatch in useEffect had PAGE_SIZE, so we start from there if we have it
            let remoteOffset = currentSessions.filter(s => s.isFinished).length;
            let iterations = 0;
            const MAX_ITERATIONS = 50; // Safety circuit breaker

            while (moreData && iterations < MAX_ITERATIONS) {
                iterations++;
                const nextBatch = await fetchDrivingSessionsFromGoogleSheets(PAGE_SIZE, remoteOffset);
                
                if (nextBatch.length === 0 || nextBatch.length < PAGE_SIZE) {
                    moreData = false;
                }
                
                if (nextBatch.length > 0) {
                    remoteOffset += nextBatch.length;
                    
                    const merged = [...currentSessions, ...nextBatch];
                    const seen = new Set<string>();
                    currentSessions = merged.filter(s => {
                        if (seen.has(s.id)) return false;
                        seen.add(s.id);
                        return true;
                    });
                } else {
                    break;
                }
            }
            
            setSessions(currentSessions);
            setHasMore(false);
            const newGrouped = groupSessionsByDay(currentSessions);
            setCurrentDayIndex(Math.max(0, newGrouped.length - 1));
        } catch (e) {
            console.error('Error in handleLastDay:', e);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const formatHeaderDate = (dateString: string) => {
        const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone shifts
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };

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
        if (!session || isProcessingShot) return;
        
        setIsProcessingShot(true);
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

        // Standard pause to prevent double clicks (500ms)
        setTimeout(() => setIsProcessingShot(false), 500);
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
            <div className="flex flex-col h-screen overflow-hidden theme-bg-primary theme-text-primary animate-fade-in relative">
                <div className="flex justify-between items-center top-0 p-4 z-10 sticky theme-bg-primary">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black">Driving Range</h1>
                        <p className="text-sm theme-text-secondary mt-1">Track your shot direction</p>
                    </div>
                    <button onClick={onMenuClick} className="p-3 theme-btn-primary rounded-lg shadow-sm">
                        <Menu size={24} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col items-center p-6">
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
                        {isLoadingSessions ? (
                            <div className="flex flex-col items-center justify-center py-12 theme-text-secondary">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-semibold animate-pulse">Syncing practice history...</p>
                            </div>
                        ) : sessions.filter(s => s.isFinished).length === 0 ? (
                            <p className="text-sm theme-text-secondary text-center py-8">No sessions recorded yet.</p>
                        ) : (
                            <div className="w-full flex flex-col items-center">
                                {/* Navigation Controls */}
                                <div className="flex items-center justify-between w-full mb-6 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-2xl border theme-border shadow-sm">
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={handleFirstDay}
                                            disabled={currentDayIndex === 0}
                                            className="p-2.5 theme-btn-primary rounded-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            title="First (Most Recent)"
                                        >
                                            <span className="text-xs font-black">|◄</span>
                                        </button>
                                        <button 
                                            onClick={handleNextDay}
                                            disabled={currentDayIndex === 0}
                                            className="p-2.5 theme-btn-primary rounded-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            title="Next (Newer)"
                                        >
                                            <span className="text-xs font-black">◄</span>
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">
                                            {formatHeaderDate(currentDayGroup.date)}
                                        </span>
                                        <span className="text-[9px] font-bold theme-text-secondary">
                                            {currentDayIndex + 1} of {groupedData.length}{hasMore ? '+' : ''}
                                        </span>
                                    </div>

                                    <div className="flex gap-1">
                                        <button 
                                            onClick={handlePrevDay}
                                            disabled={currentDayIndex === groupedData.length - 1 && !hasMore}
                                            className="p-2.5 theme-btn-primary rounded-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            title="Previous (Older)"
                                        >
                                            <span className="text-xs font-black">►</span>
                                        </button>
                                        <button 
                                            onClick={handleLastDay}
                                            disabled={!hasMore && currentDayIndex === groupedData.length - 1}
                                            className="p-2.5 theme-btn-primary rounded-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                                            title="Last (Oldest)"
                                        >
                                            <span className="text-xs font-black">►|</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Current Day Sessions */}
                                <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {currentDayGroup.sessions.map(s => {
                                        const sessionTotal = s.shots.length;
                                        const successful = s.shots.filter(shot => shot.direction === 'center').length;
                                        const acceptable = s.shots.filter(shot => shot.direction === 'left' || shot.direction === 'right').length;
                                        const missed = s.shots.filter(shot => shot.direction === 'far-left' || shot.direction === 'far-right').length;
                                        
                                        const successfulPct = sessionTotal > 0 ? Math.round((successful / sessionTotal) * 100) : 0;
                                        const acceptablePct = sessionTotal > 0 ? Math.round((acceptable / sessionTotal) * 100) : 0;
                                        const missedPct = sessionTotal > 0 ? Math.round((missed / sessionTotal) * 100) : 0;

                                        return (
                                            <div key={s.id} className="p-4 border rounded-2xl mb-4 theme-border theme-bg-secondary group hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-1">
                                                    <button 
                                                        onClick={() => setSessionToDelete(s.id)}
                                                        className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div className="flex flex-col mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{s.club}</span>
                                                        <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                                                        <span className="text-sm font-bold theme-text-primary">
                                                            {new Date(s.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold theme-text-secondary tracking-wide">
                                                        {sessionTotal} TOTAL SHOTS
                                                    </span>
                                                </div>
                                                
                                                {sessionTotal > 0 && (
                                                    <div className="space-y-3">
                                                        <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 p-0.5 border theme-border">
                                                            {successfulPct > 0 && <div className="bg-green-500 h-full rounded-full" style={{ width: `${successfulPct}%` }}></div>}
                                                            {acceptablePct > 0 && <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${acceptablePct}%` }}></div>}
                                                            {missedPct > 0 && <div className="bg-red-500 h-full rounded-full" style={{ width: `${missedPct}%` }}></div>}
                                                        </div>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border theme-border">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-black text-green-600 dark:text-green-500 uppercase">Success</span>
                                                                <span className="text-sm font-black">{successfulPct}%</span>
                                                            </div>
                                                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-800"></div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase">Acceptable</span>
                                                                <span className="text-sm font-black">{acceptablePct}%</span>
                                                            </div>
                                                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-800"></div>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase">Missed</span>
                                                                <span className="text-sm font-black">{missedPct}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {isLoadingMore && (
                                    <div className="flex items-center gap-2 py-4 theme-text-secondary animate-pulse">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Searching deep history...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer / Safe Area Spacer */}
                    <footer className="w-full max-w-sm mt-12 mb-8 flex flex-col items-center gap-4">
                        <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                                Antigravity Golf
                            </span>
                            <span className="text-[9px] font-bold theme-text-secondary mt-1">
                                Version 1.2.0 • Driving Assistant
                            </span>
                        </div>
                    </footer>
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
                    
                    <div className={`flex justify-center items-center gap-2 h-48 px-2 transition-opacity duration-200 ${isProcessingShot ? 'opacity-60' : 'opacity-100'}`}>
                        {/* Far Left - Red */}
                        <button 
                            onClick={() => handleAddShot('far-left')}
                            disabled={isProcessingShot}
                            className="flex-1 h-3/4 bg-red-400/80 active:bg-red-500 rounded-l-[50px] rounded-r-lg shadow-inner active:scale-95 transition-all text-white font-black text-lg disabled:cursor-not-allowed"
                        >
                            {farLeft > 0 && farLeft}
                        </button>
 
                        {/* Left - Yellow */}
                        <button 
                            onClick={() => handleAddShot('left')}
                            disabled={isProcessingShot}
                            className="flex-1 h-5/6 bg-yellow-400/80 active:bg-yellow-500 rounded-xl shadow-inner active:scale-95 transition-all text-white font-black text-2xl disabled:cursor-not-allowed"
                        >
                            {left > 0 && left}
                        </button>
 
                        {/* Center - Green */}
                        <button 
                            onClick={() => handleAddShot('center')}
                            disabled={isProcessingShot}
                            className="w-24 h-full bg-green-500/90 active:bg-green-600 rounded-[50px] shadow-lg active:scale-95 transition-all text-white font-black text-4xl border-4 border-green-600/30 disabled:cursor-not-allowed"
                        >
                            {center > 0 && center}
                        </button>
 
                        {/* Right - Yellow */}
                        <button 
                            onClick={() => handleAddShot('right')}
                            disabled={isProcessingShot}
                            className="flex-1 h-5/6 bg-yellow-400/80 active:bg-yellow-500 rounded-xl shadow-inner active:scale-95 transition-all text-white font-black text-2xl disabled:cursor-not-allowed"
                        >
                            {right > 0 && right}
                        </button>
 
                        {/* Far Right - Red */}
                        <button 
                            onClick={() => handleAddShot('far-right')}
                            disabled={isProcessingShot}
                            className="flex-1 h-3/4 bg-red-400/80 active:bg-red-500 rounded-r-[50px] rounded-l-lg shadow-inner active:scale-95 transition-all text-white font-black text-lg disabled:cursor-not-allowed"
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
