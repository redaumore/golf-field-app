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

export type View = 'play' | 'scorecard';
