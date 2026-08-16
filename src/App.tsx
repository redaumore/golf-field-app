import { useState, useEffect } from 'react';
import { COURSE_DATA } from './data/course';
import type { View, Round, RoundMetadata, GolfClub, GeoLocation, ShotDetail, GuestPlayer } from './types';
import { HoleView } from './components/HoleView';
import { Scorecard } from './components/Scorecard';
import { RoundsManager } from './components/RoundsManager';
import { ConfirmModal } from './components/ConfirmModal';
import { InfoModal } from './components/InfoModal';
import { StartingHoleModal } from './components/StartingHoleModal';
import { saveRoundToGoogleSheets, fetchRoundsFromGoogleSheets, deleteRoundFromGoogleSheets } from './services/googleSheetsService';
import { calculateDistance } from './utils/geo';
import { calculateRelativeScore } from './utils/score';
import { AppMenu } from './components/AppMenu';
import { DrivingRange } from './components/DrivingRange';
import { Profile } from './components/Profile';
import { calculateHandicapBreakdown } from './utils/stats';

const STORAGE_KEY = 'golf-app-rounds';
const PLAYER_NAME_KEY = 'golf-app-player-name';
const ensureTeeLocation = (round: Round | undefined, holeIndex: number): Round | undefined => {
  if (!round) return undefined;

  const holeData = COURSE_DATA[holeIndex];
  const holeNumber = holeData.number;

  // Initialize score object if missing
  const currentScore = round.scores[holeNumber] || {
    holeNumber,
    approachShots: 0,
    putts: 0,
    approachShotsDetails: []
  };

  // If teeLocation is already set, do nothing
  if (currentScore.teeLocation) return round;

  // If static tee location exists, use it
  if (holeData.teeLocation) {
    return {
      ...round,
      scores: {
        ...round.scores,
        [holeNumber]: {
          ...currentScore,
          teeLocation: { ...holeData.teeLocation } // No accuracy needed as it is optional now
        }
      }
    };
  }

  return round;
};

const Splash = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white animate-fade-in">
      <div className="relative w-48 h-48 mb-8 animate-scale-in">
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150"></div>

        {/* Icon Container */}
        <div className="relative w-full h-full rounded-[40px] overflow-hidden shadow-2xl border-4 border-white/50">
          <img
            src="/icon.png"
            alt="Golf App"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-black theme-text-accent-blue tracking-tighter mb-2">
        GOLF APP
      </h1>
      <p className="text-sm font-bold theme-text-tertiary uppercase tracking-widest animate-pulse">
        Ready to play
      </p>

      {/* Loading Bar */}
      <div className="mt-12 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-loading-bar"></div>
      </div>
    </div>
  );
};

function App() {
  const [view, setView] = useState<View>('rounds');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [isEditingRound, setIsEditingRound] = useState(false);
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem(PLAYER_NAME_KEY) || '');

  // State for sync conflict handling
  const [syncConflictModalOpen, setSyncConflictModalOpen] = useState(false);
  const [pendingRemoteRounds, setPendingRemoteRounds] = useState<Round[]>([]);
  const [unsavedLocalRoundsCount, setUnsavedLocalRoundsCount] = useState(0);

  // Splash timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // State for Info Modal (Alert replacement)
  const [infoModalState, setInfoModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showInfo = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setInfoModalState({ isOpen: true, title, message, type });
  };

  // Load rounds from localStorage on mount
  useEffect(() => {
    const savedRounds = localStorage.getItem(STORAGE_KEY);
    if (savedRounds) {
      try {
        const parsed = JSON.parse(savedRounds);
        // Convert date strings back to Date objects
        const roundsWithDates = parsed.map((r: Round) => ({
          ...r,
          date: new Date(r.date),
        }));
        setRounds(roundsWithDates);
      } catch (e) {
        console.error('Failed to load rounds', e);
      }
    }
  }, []);

  // Sync with Google Sheets on mount
  useEffect(() => {
    const syncWithCloud = async () => {
      setIsLoading(true);
      try {
        const remoteRounds = await fetchRoundsFromGoogleSheets();

        // Read directly from localStorage to check for unsaved rounds
        // We do this to ensure we are comparing against the "boot" state
        const savedRoundsStr = localStorage.getItem(STORAGE_KEY);
        let localRounds: Round[] = [];
        if (savedRoundsStr) {
          try {
            const parsed = JSON.parse(savedRoundsStr);
            // Simple cast only for ID check
            localRounds = parsed.map((r: Round) => ({ ...r, date: new Date(r.date) }));
          } catch (e) { console.error(e); }
        }

        // Find rounds that are in local but NOT in remote
        const localOnly = localRounds.filter(local => !remoteRounds.some(remote => remote.id === local.id));

        if (localOnly.length > 0) {
          // Conflict found! Ask user what to do.
          setPendingRemoteRounds(remoteRounds);
          setUnsavedLocalRoundsCount(localOnly.length);
          setSyncConflictModalOpen(true);
        } else {
          // No conflict, safe to overwrite
          setRounds(remoteRounds);
        }

      } catch (error) {
        console.error('Failed to sync rounds:', error);
        // If sync fails, we keep the localStorage rounds (fallback)
      } finally {
        setIsLoading(false);
      }
    };

    if (navigator.onLine) {
      syncWithCloud();
    }
  }, []);

  const handleKeepLocalRounds = () => {
    // Merge strategy: Keep all local rounds that are missing from remote + all remote rounds
    // Essentially: Remote is source of truth for its own IDs. Local is source of truth for new IDs.
    const localRoundsStr = localStorage.getItem(STORAGE_KEY);
    let localRounds: Round[] = [];
    if (localRoundsStr) try { localRounds = JSON.parse(localRoundsStr).map((r: Round) => ({ ...r, date: new Date(r.date) })); } catch { /* ignore invalid local storage */ }

    const localOnly = localRounds.filter(local => !pendingRemoteRounds.some(remote => remote.id === local.id));
    const merged = [...pendingRemoteRounds, ...localOnly];

    // Sort by date desc
    merged.sort((a, b) => b.date.getTime() - a.date.getTime());

    setRounds(merged);
    setSyncConflictModalOpen(false);
    setPendingRemoteRounds([]);
  };

  const handleDiscardLocalRounds = () => {
    setRounds(pendingRemoteRounds);
    setSyncConflictModalOpen(false);
    setPendingRemoteRounds([]);
  };

  // Save rounds to localStorage whenever they change
  useEffect(() => {
    if (rounds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    }
  }, [rounds]);

  // Persist player name to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }, [playerName]);

  const handleNameChange = (name: string) => setPlayerName(name);

  // Generate round ID from current date (dd-mm-yyyy)
  const generateRoundId = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Open modal to select starting hole
  const handleCreateRoundRequest = () => {
    setShowStartHoleModal(true);
  };

  // Create a new round with selected starting hole
  const handleStartRoundConfirmed = (startingHole: number, guests?: GuestPlayer[]) => {
    setShowStartHoleModal(false);

    const baseId = generateRoundId();
    let newRoundId = baseId;

    // Find all rounds created today (starting with baseId)
    const roundsToday = rounds.filter(r => r.id === baseId || r.id.startsWith(`${baseId}-`));

    if (roundsToday.length > 0) {
      // If rounds exist, append count to make unique ID
      newRoundId = `${baseId}-${roundsToday.length}`;
    }

    const startHoleIndex = startingHole - 1;

    let newRound: Round = {
      id: newRoundId,
      date: new Date(),
      scores: {},
      currentHoleIndex: startHoleIndex,
      startingHoleNumber: startingHole,
      isFinished: false,
      guests: guests,
    };

    // Auto-set tee location for the first hole
    const roundWithTee = ensureTeeLocation(newRound, startHoleIndex);
    if (roundWithTee) {
      newRound = roundWithTee;
    }

    setRounds(prev => [...prev, newRound]);
    setCurrentRoundId(newRoundId);
    setCurrentHoleIndex(startHoleIndex);
    setView('play');
  };

  // Select an existing round
  const handleSelectRound = (roundId: string) => {
    const round = rounds.find(r => r.id === roundId);
    if (round) {
      setCurrentRoundId(roundId);
      setCurrentHoleIndex(round.currentHoleIndex);
      setIsEditingRound(false);

      // Ensure tee location for current hole when resuming
      if (!round.isFinished) {
        setRounds(prev => prev.map(r => {
          if (r.id === roundId) {
            const updated = ensureTeeLocation(r, round.currentHoleIndex);
            return updated || r;
          }
          return r;
        }));
      }

      // Si la rueda está finalizada, ir directo al scorecard
      setView(round.isFinished ? 'scorecard' : 'play');
    }
  };

  // Edit a specific hole in a round
  const handleEditHole = (holeNumber: number) => {
    setIsEditingRound(true);
    setCurrentHoleIndex(holeNumber - 1);
    setView('play');
  };

  // Delete a round
  const handleDeleteRound = async (roundId: string) => {
    // Optimistic update
    setRounds(prev => prev.filter(r => r.id !== roundId));

    if (currentRoundId === roundId) {
      setCurrentRoundId(null);
      setView('rounds');
    }

    try {
      await deleteRoundFromGoogleSheets(roundId);
    } catch (error) {
      console.error('Failed to delete round from cloud:', error);
      showInfo(
        'Delete Failed',
        'Could not delete round from Google Sheets. It might reappear on next sync.',
        'error'
      );
    }
  };

  // Finish a round manually (or save edits)
  const handleFinishRound = async () => {
    if (!currentRoundId) return;

    // Save to Google Sheets
    const roundToSave = rounds.find(r => r.id === currentRoundId);
    if (roundToSave) {
      const finishedRound = { ...roundToSave, isFinished: true };
      try {
        await saveRoundToGoogleSheets(finishedRound);
        showInfo('Saved Successfully', 'Round has been saved to Google Sheets.', 'success');
      } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        showInfo('Save Failed', 'Error saving to Google Sheets, but it was saved locally.', 'error');
      }
    }

    setRounds(prev => prev.map(round =>
      round.id === currentRoundId
        ? { ...round, isFinished: true }
        : round
    ));

    const wasEditing = isEditingRound;
    setIsEditingRound(false);
    setView(wasEditing ? 'scorecard' : 'rounds');
  };

  // Calculate distance in yards between two coordinates




  // Update score for current round
  const handleUpdateScore = (type: 'approach' | 'putt', delta: number, club?: GolfClub, location?: GeoLocation, isRepresentative?: boolean) => {
    if (!currentRoundId) return;

    const holeNumber = COURSE_DATA[currentHoleIndex].number;

    setRounds(prev => prev.map(round => {
      if (round.id !== currentRoundId) return round;

      const currentScore = round.scores[holeNumber] || {
        holeNumber,
        approachShots: 0,
        putts: 0,
        approachShotsDetails: []
      };

      const newScore = { ...currentScore };
      if (type === 'approach') {
        newScore.approachShots = Math.max(0, newScore.approachShots + delta);

        // Handle club details
        if (delta > 0 && club) {
          let distance: number | undefined;

          // Calculate distance if we have current location and a previous point (tee or last shot)
          if (location) {
            const previousShots = newScore.approachShotsDetails || [];
            let previousLocation = newScore.teeLocation; // Default to Tee

            // If there are previous shots with location, use the last one
            for (let i = previousShots.length - 1; i >= 0; i--) {
              if (previousShots[i].location) {
                previousLocation = previousShots[i].location;
                break;
              }
            }

            if (previousLocation) {
              distance = calculateDistance(previousLocation, location);
            }
          }

          const shotDetail: ShotDetail = {
            club,
            timestamp: Date.now(),
            location,
            distance,
            isRepresentative
          };
          newScore.approachShotsDetails = [...(newScore.approachShotsDetails || []), shotDetail];
        } else if (delta < 0) {
          // Remove last added club if reducing score
          const details = [...(newScore.approachShotsDetails || [])];
          details.pop();
          newScore.approachShotsDetails = details;
        }
      } else {
        newScore.putts = Math.max(0, newScore.putts + delta);
      }

      return {
        ...round,
        scores: { ...round.scores, [holeNumber]: newScore },
      };
    }));
  };

  // Update guest score for current round
  const handleUpdateGuestScore = (guestId: string, type: 'approach' | 'putt', delta: number) => {
    if (!currentRoundId) return;

    const holeNumber = COURSE_DATA[currentHoleIndex].number;

    setRounds(prev => prev.map(round => {
      if (round.id !== currentRoundId || !round.guests) return round;

      const updatedGuests = round.guests.map(guest => {
        if (guest.id !== guestId) return guest;

        const currentGuestScore = guest.scores[holeNumber] || { approachShots: 0, putts: 0 };
        const newGuestScore = { ...currentGuestScore };

        if (type === 'approach') {
          newGuestScore.approachShots = Math.max(0, newGuestScore.approachShots + delta);
        } else {
          newGuestScore.putts = Math.max(0, newGuestScore.putts + delta);
        }

        return {
          ...guest,
          scores: {
            ...guest.scores,
            [holeNumber]: newGuestScore
          }
        };
      });

      return {
        ...round,
        guests: updatedGuests
      };
    }));
  };

  // Navigate to next hole (Circular)
  const handleNext = () => {
    const nextIndex = (currentHoleIndex + 1) % COURSE_DATA.length;
    setCurrentHoleIndex(nextIndex);

    // Update current hole index in the round and ensure tee location for next hole
    if (currentRoundId) {
      setRounds(prev => prev.map(round => {
        if (round.id === currentRoundId) {
          const updatedRound = { ...round, currentHoleIndex: nextIndex };
          const roundWithTee = ensureTeeLocation(updatedRound, nextIndex);
          return roundWithTee || updatedRound;
        }
        return round;
      }));
    }
  };

  // Navigate to previous hole (Circular)
  const handlePrev = () => {
    const prevIndex = (currentHoleIndex - 1 + COURSE_DATA.length) % COURSE_DATA.length;
    setCurrentHoleIndex(prevIndex);

    // Update current hole index in the round and ensure tee location for prev hole
    if (currentRoundId) {
      setRounds(prev => prev.map(round => {
        if (round.id === currentRoundId) {
          const updatedRound = { ...round, currentHoleIndex: prevIndex };
          const roundWithTee = ensureTeeLocation(updatedRound, prevIndex);
          return roundWithTee || updatedRound;
        }
        return round;
      }));
    }
  };

  // Get rounds metadata for the manager
  const getRoundsMetadata = (): RoundMetadata[] => {
    return rounds.map(round => {
      const totalScore = Object.values(round.scores).reduce(
        (acc, score) => acc + score.approachShots + score.putts,
        0
      );
      // Una rueda está completa si jugó los 18 hoyos O si la finalizó manualmente
      const isComplete = round.isFinished || Object.keys(round.scores).length === COURSE_DATA.length;

      return {
        id: round.id,
        date: round.date,
        totalScore,
        isComplete,
      };
    });
  };

  // Get current round data
  const currentRound = currentRoundId
    ? rounds.find(r => r.id === currentRoundId)
    : null;

  const isCurrentRoundComplete = currentRound
    ? currentRound.isFinished
    : false;

  const currentHole = COURSE_DATA[currentHoleIndex];
  const currentScore = currentRound?.scores[currentHole.number] || {
    holeNumber: currentHole.number,
    approachShots: 0,
    putts: 0
  };

  // Determine starting hole to calculate order
  const startingHole = currentRound?.startingHoleNumber || 1;
  const startingHoleIndex = startingHole - 1;

  // Calculate strict isFirst/isLast for navigation bounds based on starting hole
  // isFirst: matches start hole
  // isLast: is the hole immediately preceding the start hole in the circle
  const isFirst = currentHoleIndex === startingHoleIndex;
  const isLast = (currentHoleIndex + 1) % COURSE_DATA.length === startingHoleIndex;

  const completedRoundsCount = rounds.filter(r => r.isFinished).length;
  const handicapBreakdown = calculateHandicapBreakdown(rounds, COURSE_DATA);

  return (
    <div className="min-h-screen w-full bg-white">
      {showSplash && <Splash />}
      {view === 'rounds' ? (
        <RoundsManager
          onMenuClick={() => setShowAppMenu(true)}
          rounds={getRoundsMetadata()}
          onCreateRound={handleCreateRoundRequest}
          onSelectRound={handleSelectRound}
          onDeleteRound={handleDeleteRound}
          isLoading={isLoading}
          onSyncRound={async (roundId) => {
            const round = rounds.find(r => r.id === roundId);
            if (round) {
              const roundToSave = { ...round, isFinished: true }; // Ensure it's marked as finished on sync
              try {
                await saveRoundToGoogleSheets(roundToSave);
                showInfo('Sync Successful', 'Round synced to cloud.', 'success');
              } catch (error) {
                console.error('Sync failed', error);
                showInfo('Sync Failed', 'Failed to sync round. Please try again.', 'error');
              }
            }
          }}
        />
      ) : view === 'play' ? (
        <HoleView
          onMenuClick={() => setShowAppMenu(true)}
          hole={currentHole}
          score={currentScore}
          onUpdateScore={handleUpdateScore}
          onNext={handleNext}
          onPrev={handlePrev}
          onFinishRound={handleFinishRound}
          isFirst={isFirst}
          isLast={isLast}
          isReadOnly={isCurrentRoundComplete && !isEditingRound}
          relativeScore={calculateRelativeScore(COURSE_DATA, currentRound?.scores || {})}
          guests={currentRound?.guests}
          onUpdateGuestScore={handleUpdateGuestScore}
          onOpenScorecard={() => setView('scorecard')}
        />
      ) : view === 'scorecard' ? (
        <Scorecard
          onMenuClick={() => setShowAppMenu(true)}
          course={COURSE_DATA}
          scores={currentRound?.scores || {}}
          guests={currentRound?.guests}
          onBack={() => setView(isCurrentRoundComplete ? 'rounds' : 'play')}
          onEditHole={handleEditHole}
        />
      ) : view === 'profile' ? (
        <Profile
          playerName={playerName}
          breakdown={handicapBreakdown}
          roundsCount={completedRoundsCount}
          onNameChange={handleNameChange}
          onMenuClick={() => setShowAppMenu(true)}
          onBack={() => setView('rounds')}
        />
      ) : (
        <DrivingRange 
          onMenuClick={() => setShowAppMenu(true)}
        />
      )}

      <AppMenu
        isOpen={showAppMenu}
        onClose={() => setShowAppMenu(false)}
        onNavigateToRounds={() => setView('rounds')}
        onNavigateToDriving={() => setView('driving')}
        onNavigateToProfile={() => setView('profile')}
      />

      <StartingHoleModal
        isOpen={showStartHoleModal}
        onConfirm={handleStartRoundConfirmed}
        onCancel={() => setShowStartHoleModal(false)}
      />

      <ConfirmModal
        isOpen={syncConflictModalOpen}
        title="Unsynced Rounds Found"
        message={`We found ${unsavedLocalRoundsCount} round(s) on your device that are not saved in the cloud. Do you want to keep them?`}
        confirmText="Keep & Sync"
        cancelText="Discard (Use Cloud Only)"
        confirmButtonClass="bg-blue-600 text-white hover:bg-blue-700"
        onConfirm={handleKeepLocalRounds}
        onCancel={handleDiscardLocalRounds}
      />

      <InfoModal
        isOpen={infoModalState.isOpen}
        title={infoModalState.title}
        message={infoModalState.message}
        type={infoModalState.type}
        onClose={() => setInfoModalState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;
