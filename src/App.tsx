import { useState, useEffect } from 'react';
import { getCourseById, DEFAULT_COURSE_ID } from './data/course';
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
import { calculateHandicapBreakdown, averageLostBalls, historicalMaxDistanceByClub } from './utils/stats';
import { addClubToBag, removeClubFromBag, normalizeBag, moveClub, DEFAULT_BAG } from './utils/bag';

const STORAGE_KEY = 'golf-app-rounds';
const PLAYER_NAME_KEY = 'golf-app-player-name';
const BAG_KEY = 'golf-app-bag';

const isValidCoord = (loc?: { latitude: number; longitude: number } | null): boolean => {
  return Boolean(loc && (loc.latitude !== 0 || loc.longitude !== 0));
};

const ensureTeeLocation = (round: Round | undefined, holeIndex: number): Round | undefined => {
  if (!round) return undefined;

  const course = getCourseById(round.courseId);
  const holeData = course.holes[holeIndex];
  if (!holeData) return round;
  const holeNumber = holeData.number;

  // Initialize score object if missing
  const currentScore = round.scores[holeNumber] || {
    holeNumber,
    approachShots: 0,
    putts: 0,
    approachShotsDetails: []
  };

  // If teeLocation is already set with valid coords, do nothing
  if (isValidCoord(currentScore.teeLocation)) return round;

  // If static non-zero tee location exists in course data, use it
  if (isValidCoord(holeData.teeLocation)) {
    return {
      ...round,
      scores: {
        ...round.scores,
        [holeNumber]: {
          ...currentScore,
          teeLocation: { ...holeData.teeLocation! }
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

  const [bag, setBag] = useState<GolfClub[]>(() => {
    const raw = localStorage.getItem(BAG_KEY);
    if (!raw) return DEFAULT_BAG;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_BAG;
      return normalizeBag(parsed);
    } catch {
      return DEFAULT_BAG;
    }
  });

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
          courseId: r.courseId || DEFAULT_COURSE_ID,
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
        const savedRoundsStr = localStorage.getItem(STORAGE_KEY);
        let localRounds: Round[] = [];
        if (savedRoundsStr) {
          try {
            const parsed = JSON.parse(savedRoundsStr);
            localRounds = parsed.map((r: Round) => ({
              ...r,
              courseId: r.courseId || DEFAULT_COURSE_ID,
              date: new Date(r.date),
            }));
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
      } finally {
        setIsLoading(false);
      }
    };

    if (navigator.onLine) {
      syncWithCloud();
    }
  }, []);

  const handleKeepLocalRounds = () => {
    const localRoundsStr = localStorage.getItem(STORAGE_KEY);
    let localRounds: Round[] = [];
    if (localRoundsStr) try {
      localRounds = JSON.parse(localRoundsStr).map((r: Round) => ({
        ...r,
        courseId: r.courseId || DEFAULT_COURSE_ID,
        date: new Date(r.date),
      }));
    } catch { /* ignore invalid local storage */ }

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

  // Persist bag to localStorage whenever it changes (including empty bag)
  useEffect(() => {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  }, [bag]);

  const handleNameChange = (name: string) => setPlayerName(name);

  const handleAddClub = (club: GolfClub) => setBag(prev => addClubToBag(prev, club));
  const handleRemoveClub = (club: GolfClub) => setBag(prev => removeClubFromBag(prev, club));
  const handleMoveClub = (fromIndex: number, toIndex: number) => setBag(prev => moveClub(prev, fromIndex, toIndex));

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

  // Create a new round with selected starting hole and course
  const handleStartRoundConfirmed = (startingHole: number, guests?: GuestPlayer[], courseId?: string) => {
    setShowStartHoleModal(false);

    const selectedCourseId = courseId || DEFAULT_COURSE_ID;
    const baseId = generateRoundId();
    let newRoundId = baseId;

    // Find all rounds created today (starting with baseId)
    const roundsToday = rounds.filter(r => r.id === baseId || r.id.startsWith(`${baseId}-`));

    if (roundsToday.length > 0) {
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
      courseId: selectedCourseId,
    };

    // Auto-set tee location for the first hole if statically defined
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

  // Set Tee location for the active hole via GPS
  const handleSetTeeLocation = (location: GeoLocation) => {
    if (!currentRoundId) return;

    const round = rounds.find(r => r.id === currentRoundId);
    const course = getCourseById(round?.courseId);
    const currentHoleData = course.holes[currentHoleIndex];
    if (!currentHoleData) return;
    const holeNumber = currentHoleData.number;

    setRounds(prev => prev.map(r => {
      if (r.id !== currentRoundId) return r;

      const currentScore = r.scores[holeNumber] || {
        holeNumber,
        approachShots: 0,
        putts: 0,
        approachShotsDetails: []
      };

      return {
        ...r,
        scores: {
          ...r.scores,
          [holeNumber]: {
            ...currentScore,
            teeLocation: location
          }
        }
      };
    }));
  };

  // Update score for current round
  const handleUpdateScore = (type: 'approach' | 'putt', delta: number, club?: GolfClub, location?: GeoLocation, isRepresentative?: boolean, fairwayHit?: boolean) => {
    if (!currentRoundId) return;

    const round = rounds.find(r => r.id === currentRoundId);
    const course = getCourseById(round?.courseId);
    const holeNumber = course.holes[currentHoleIndex].number;

    setRounds(prev => prev.map(r => {
      if (r.id !== currentRoundId) return r;

      const currentScore = r.scores[holeNumber] || {
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
          if (location && isValidCoord(location)) {
            const previousShots = newScore.approachShotsDetails || [];
            let previousLocation = isValidCoord(newScore.teeLocation) ? newScore.teeLocation : undefined;

            // If there are previous shots with location, use the last one
            for (let i = previousShots.length - 1; i >= 0; i--) {
              if (isValidCoord(previousShots[i].location)) {
                previousLocation = previousShots[i].location;
                break;
              }
            }

            if (previousLocation && isValidCoord(previousLocation)) {
              distance = calculateDistance(previousLocation, location);
            }
          }

          const shotDetail: ShotDetail = {
            club,
            timestamp: Date.now(),
            location,
            distance,
            isRepresentative,
            fairwayHit
          };
          newScore.approachShotsDetails = [...(newScore.approachShotsDetails || []), shotDetail];
        } else if (delta < 0) {
          const details = [...(newScore.approachShotsDetails || [])];
          details.pop();
          newScore.approachShotsDetails = details;
        }
      } else {
        newScore.putts = Math.max(0, newScore.putts + delta);
      }

      return {
        ...r,
        scores: { ...r.scores, [holeNumber]: newScore },
      };
    }));
  };

  // Update guest score for current round
  const handleUpdateGuestScore = (guestId: string, type: 'approach' | 'putt', delta: number) => {
    if (!currentRoundId) return;

    const round = rounds.find(r => r.id === currentRoundId);
    const course = getCourseById(round?.courseId);
    const holeNumber = course.holes[currentHoleIndex].number;

    setRounds(prev => prev.map(r => {
      if (r.id !== currentRoundId || !r.guests) return r;

      const updatedGuests = r.guests.map(guest => {
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
        ...r,
        guests: updatedGuests
      };
    }));
  };

  // Navigate to next hole (Circular)
  const handleNext = () => {
    const course = getCourseById(currentRound?.courseId);
    const nextIndex = (currentHoleIndex + 1) % course.holes.length;
    setCurrentHoleIndex(nextIndex);

    if (currentRoundId) {
      setRounds(prev => prev.map(r => {
        if (r.id === currentRoundId) {
          const updatedRound = { ...r, currentHoleIndex: nextIndex };
          const roundWithTee = ensureTeeLocation(updatedRound, nextIndex);
          return roundWithTee || updatedRound;
        }
        return r;
      }));
    }
  };

  // Navigate to previous hole (Circular)
  const handlePrev = () => {
    const course = getCourseById(currentRound?.courseId);
    const prevIndex = (currentHoleIndex - 1 + course.holes.length) % course.holes.length;
    setCurrentHoleIndex(prevIndex);

    if (currentRoundId) {
      setRounds(prev => prev.map(r => {
        if (r.id === currentRoundId) {
          const updatedRound = { ...r, currentHoleIndex: prevIndex };
          const roundWithTee = ensureTeeLocation(updatedRound, prevIndex);
          return roundWithTee || updatedRound;
        }
        return r;
      }));
    }
  };

  // Get rounds metadata for the manager
  const getRoundsMetadata = (): RoundMetadata[] => {
    return rounds.map(round => {
      const course = getCourseById(round.courseId);
      const totalScore = Object.values(round.scores).reduce(
        (acc, score) => acc + score.approachShots + score.putts,
        0
      );
      const isComplete = round.isFinished || Object.keys(round.scores).length === course.holes.length;

      return {
        id: round.id,
        date: round.date,
        totalScore,
        isComplete,
        courseName: course.course_name,
        courseId: course.id,
      };
    });
  };

  // Get current round and active course data
  const currentRound = currentRoundId
    ? rounds.find(r => r.id === currentRoundId)
    : null;

  const currentCourse = getCourseById(currentRound?.courseId);

  const isCurrentRoundComplete = currentRound
    ? currentRound.isFinished
    : false;

  const currentHole = currentCourse.holes[currentHoleIndex] || currentCourse.holes[0];
  const currentScore = currentRound?.scores[currentHole.number] || {
    holeNumber: currentHole.number,
    approachShots: 0,
    putts: 0
  };

  // Determine starting hole to calculate order
  const startingHole = currentRound?.startingHoleNumber || 1;
  const startingHoleIndex = startingHole - 1;

  // Calculate strict isFirst/isLast for navigation bounds based on starting hole
  const isFirst = currentHoleIndex === startingHoleIndex;
  const isLast = (currentHoleIndex + 1) % currentCourse.holes.length === startingHoleIndex;

  const completedRoundsCount = rounds.filter(r => r.isFinished).length;
  const handicapBreakdown = calculateHandicapBreakdown(rounds);
  const lostBallsAverage = averageLostBalls(rounds);
  const historicalClubDistances = historicalMaxDistanceByClub(rounds);

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
              const roundToSave = { ...round, isFinished: true };
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
          onSetTeeLocation={handleSetTeeLocation}
          isFirst={isFirst}
          isLast={isLast}
          isReadOnly={isCurrentRoundComplete && !isEditingRound}
          relativeScore={calculateRelativeScore(
            currentCourse.holes,
            currentRound?.scores || {},
            currentHole.number
          )}
          guests={currentRound?.guests}
          onUpdateGuestScore={handleUpdateGuestScore}
          onOpenScorecard={() => setView('scorecard')}
          bagClubs={bag}
          courseName={currentCourse.course_name}
          courseId={currentCourse.id}
        />
      ) : view === 'scorecard' ? (
        <Scorecard
          onMenuClick={() => setShowAppMenu(true)}
          course={currentCourse.holes}
          scores={currentRound?.scores || {}}
          guests={currentRound?.guests}
          onBack={() => setView(isCurrentRoundComplete ? 'rounds' : 'play')}
          onEditHole={handleEditHole}
          courseName={currentCourse.course_name}
          activeHoleNumber={!isCurrentRoundComplete ? currentHole.number : undefined}
        />
      ) : view === 'profile' ? (
        <Profile
          playerName={playerName}
          breakdown={handicapBreakdown}
          roundsCount={completedRoundsCount}
          lostBallsAverage={lostBallsAverage}
          historicalClubDistances={historicalClubDistances}
          bag={bag}
          onAddClub={handleAddClub}
          onRemoveClub={handleRemoveClub}
          onMoveClub={handleMoveClub}
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
