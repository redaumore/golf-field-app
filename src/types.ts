export interface Hole {
  number: number;
  par: number;
  distance: number; // in yards or meters
  handicap?: number;
}

export interface HoleScore {
  holeNumber: number;
  approachShots: number;
  putts: number;
}

export interface Round {
  id: string; // formato: dd-mm-yyyy
  date: Date;
  scores: Record<number, HoleScore>;
  currentHoleIndex: number;
}

export interface RoundMetadata {
  id: string;
  date: Date;
  totalScore: number;
  isComplete: boolean;
}

export type View = 'rounds' | 'play' | 'scorecard';
