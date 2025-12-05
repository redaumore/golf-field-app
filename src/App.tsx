import { useState, useEffect } from 'react';
import { COURSE_DATA } from './data/course';
import type { HoleScore, View } from './types';
import { HoleView } from './components/HoleView';
import { Scorecard } from './components/Scorecard';

function App() {
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [view, setView] = useState<View>('play');
  const [scores, setScores] = useState<Record<number, HoleScore>>({});

  // Load from local storage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('golf-app-scores');
    if (savedScores) {
      try {
        setScores(JSON.parse(savedScores));
      } catch (e) {
        console.error('Failed to load scores', e);
      }
    }

    const savedHole = localStorage.getItem('golf-app-current-hole');
    if (savedHole) {
      setCurrentHoleIndex(parseInt(savedHole, 10));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('golf-app-scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('golf-app-current-hole', currentHoleIndex.toString());
  }, [currentHoleIndex]);

  const handleUpdateScore = (type: 'approach' | 'putt', delta: number) => {
    const holeNumber = COURSE_DATA[currentHoleIndex].number;
    setScores(prev => {
      const currentScore = prev[holeNumber] || { holeNumber, approachShots: 0, putts: 0 };
      const newScore = { ...currentScore };

      if (type === 'approach') {
        newScore.approachShots = Math.max(0, newScore.approachShots + delta);
      } else {
        newScore.putts = Math.max(0, newScore.putts + delta);
      }

      return { ...prev, [holeNumber]: newScore };
    });
  };

  const handleNext = () => {
    if (currentHoleIndex < COURSE_DATA.length - 1) {
      setCurrentHoleIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentHoleIndex > 0) {
      setCurrentHoleIndex(prev => prev - 1);
    }
  };

  const currentHole = COURSE_DATA[currentHoleIndex];
  const currentScore = scores[currentHole.number] || { holeNumber: currentHole.number, approachShots: 0, putts: 0 };

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      {view === 'play' ? (
        <HoleView
          hole={currentHole}
          score={currentScore}
          onUpdateScore={handleUpdateScore}
          onNext={handleNext}
          onPrev={handlePrev}
          onShowScorecard={() => setView('scorecard')}
          isFirst={currentHoleIndex === 0}
          isLast={currentHoleIndex === COURSE_DATA.length - 1}
        />
      ) : (
        <Scorecard
          course={COURSE_DATA}
          scores={scores}
          onBack={() => setView('play')}
        />
      )}
    </div>
  );
}

export default App;
