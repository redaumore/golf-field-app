import { useState, useEffect } from 'react';
import { COURSE_DATA } from './data/course';
import type { View, Round, RoundMetadata, GolfClub, GeoLocation, ShotDetail } from './types';
import { HoleView } from './components/HoleView';
import { Scorecard } from './components/Scorecard';
import { RoundsManager } from './components/RoundsManager';
import { StartingHoleModal } from './components/StartingHoleModal';
import { saveRoundToGoogleSheets } from './services/googleSheetsService';

const STORAGE_KEY = 'golf-app-rounds';

function App() {
  const [view, setView] = useState<View>('rounds');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);

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

  // Save rounds to localStorage whenever they change
  useEffect(() => {
    if (rounds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    }
  }, [rounds]);

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
  const handleStartRoundConfirmed = (startingHole: number) => {
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

    const newRound: Round = {
      id: newRoundId,
      date: new Date(),
      scores: {},
      currentHoleIndex: startHoleIndex,
      startingHoleNumber: startingHole,
      isFinished: false,
    };

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
      // Si la rueda está finalizada, ir directo al scorecard
      setView(round.isFinished ? 'scorecard' : 'play');
    }
  };

  // Delete a round
  const handleDeleteRound = (roundId: string) => {
    setRounds(prev => prev.filter(r => r.id !== roundId));
    if (currentRoundId === roundId) {
      setCurrentRoundId(null);
      setView('rounds');
    }
  };

  // Finish a round manually
  const handleFinishRound = async () => {
    if (!currentRoundId) return;

    // Save to Google Sheets
    const roundToSave = rounds.find(r => r.id === currentRoundId);
    if (roundToSave) {
      const finishedRound = { ...roundToSave, isFinished: true };
      try {
        await saveRoundToGoogleSheets(finishedRound);
        alert('Ronda guardada correctamente en Google Sheets');
      } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        alert('Error al guardar en Google Sheets, pero se guardó localmente.');
      }
    }

    setRounds(prev => prev.map(round =>
      round.id === currentRoundId
        ? { ...round, isFinished: true }
        : round
    ));

    setView('rounds');
  };

  // Calculate distance in yards between two coordinates
  const calculateDistance = (loc1: GeoLocation, loc2: GeoLocation): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in meters
    return Math.round(d * 1.09361); // return yards
  }

  const handleSetTeeLocation = (location: GeoLocation) => {
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

      return {
        ...round,
        scores: {
          ...round.scores,
          [holeNumber]: { ...currentScore, teeLocation: location }
        }
      };
    }));
  }

  // Update score for current round
  const handleUpdateScore = (type: 'approach' | 'putt', delta: number, club?: GolfClub, location?: GeoLocation) => {
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
            distance
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

  // Navigate to next hole (Circular)
  const handleNext = () => {
    const nextIndex = (currentHoleIndex + 1) % COURSE_DATA.length;
    setCurrentHoleIndex(nextIndex);

    // Update current hole index in the round
    if (currentRoundId) {
      setRounds(prev => prev.map(round =>
        round.id === currentRoundId
          ? { ...round, currentHoleIndex: nextIndex }
          : round
      ));
    }
  };

  // Navigate to previous hole (Circular)
  const handlePrev = () => {
    const prevIndex = (currentHoleIndex - 1 + COURSE_DATA.length) % COURSE_DATA.length;
    setCurrentHoleIndex(prevIndex);

    // Update current hole index in the round
    if (currentRoundId) {
      setRounds(prev => prev.map(round =>
        round.id === currentRoundId
          ? { ...round, currentHoleIndex: prevIndex }
          : round
      ));
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

  return (
    <div className="min-h-screen w-full bg-white">
      {view === 'rounds' ? (
        <RoundsManager
          rounds={getRoundsMetadata()}
          onCreateRound={handleCreateRoundRequest}
          onSelectRound={handleSelectRound}
          onDeleteRound={handleDeleteRound}
        />
      ) : view === 'play' ? (
        <HoleView
          hole={currentHole}
          score={currentScore}
          onUpdateScore={handleUpdateScore}
          onNext={handleNext}
          onPrev={handlePrev}
          onShowScorecard={() => setView('scorecard')}
          onBackToRounds={() => setView('rounds')}
          onFinishRound={handleFinishRound}
          onSetTeeLocation={handleSetTeeLocation}
          isFirst={isFirst}
          isLast={isLast}
          isReadOnly={isCurrentRoundComplete}
        />
      ) : (
        <Scorecard
          course={COURSE_DATA}
          scores={currentRound?.scores || {}}
          onBack={() => setView(isCurrentRoundComplete ? 'rounds' : 'play')}
        />
      )}

      <StartingHoleModal
        isOpen={showStartHoleModal}
        onConfirm={handleStartRoundConfirmed}
        onCancel={() => setShowStartHoleModal(false)}
      />
    </div>
  );
}

export default App;
