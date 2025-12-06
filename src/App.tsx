import { useState, useEffect } from 'react';
import { COURSE_DATA } from './data/course';
import type { View, Round, RoundMetadata, GolfClub, GeoLocation, ShotDetail } from './types';
import { HoleView } from './components/HoleView';
import { Scorecard } from './components/Scorecard';
import { RoundsManager } from './components/RoundsManager';

const STORAGE_KEY = 'golf-app-rounds';

function App() {
  const [view, setView] = useState<View>('rounds');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);

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

  // Create a new round
  const handleCreateRound = () => {
    const baseId = generateRoundId();
    let newRoundId = baseId;

    // Find all rounds created today (starting with baseId)
    const roundsToday = rounds.filter(r => r.id === baseId || r.id.startsWith(`${baseId}-`));

    if (roundsToday.length > 0) {
      // If rounds exist, append count to make unique ID
      // Example: 05-12-2025 -> 05-12-2025-1 -> 05-12-2025-2
      newRoundId = `${baseId}-${roundsToday.length}`;
    }

    const newRound: Round = {
      id: newRoundId,
      date: new Date(),
      scores: {},
      currentHoleIndex: 0,
      isFinished: false,
    };

    setRounds(prev => [...prev, newRound]);
    setCurrentRoundId(newRoundId);
    setCurrentHoleIndex(0);
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
  const handleFinishRound = () => {
    if (!currentRoundId) return;

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

  // Navigate to next hole
  const handleNext = () => {
    if (currentHoleIndex < COURSE_DATA.length - 1) {
      const newIndex = currentHoleIndex + 1;
      setCurrentHoleIndex(newIndex);

      // Update current hole index in the round
      if (currentRoundId) {
        setRounds(prev => prev.map(round =>
          round.id === currentRoundId
            ? { ...round, currentHoleIndex: newIndex }
            : round
        ));
      }
    }
  };

  // Navigate to previous hole
  const handlePrev = () => {
    if (currentHoleIndex > 0) {
      const newIndex = currentHoleIndex - 1;
      setCurrentHoleIndex(newIndex);

      // Update current hole index in the round
      if (currentRoundId) {
        setRounds(prev => prev.map(round =>
          round.id === currentRoundId
            ? { ...round, currentHoleIndex: newIndex }
            : round
        ));
      }
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
    ? (currentRound.isFinished || Object.keys(currentRound.scores).length === COURSE_DATA.length)
    : false;

  const currentHole = COURSE_DATA[currentHoleIndex];
  const currentScore = currentRound?.scores[currentHole.number] || {
    holeNumber: currentHole.number,
    approachShots: 0,
    putts: 0
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {view === 'rounds' ? (
        <RoundsManager
          rounds={getRoundsMetadata()}
          onCreateRound={handleCreateRound}
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
          isFirst={currentHoleIndex === 0}
          isLast={currentHoleIndex === COURSE_DATA.length - 1}
          isReadOnly={isCurrentRoundComplete}
        />
      ) : (
        <Scorecard
          course={COURSE_DATA}
          scores={currentRound?.scores || {}}
          onBack={() => setView(isCurrentRoundComplete ? 'rounds' : 'play')}
        />
      )}
    </div>
  );
}

export default App;
