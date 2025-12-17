export interface Hole {
  number: number;
  par: number;
  distance: number; // in yards or meters
  handicap?: number;
}

export type GolfClub = '1w' | '3w' | '4i' | '5i' | '6i' | '7i' | '8i' | '9i' | 'Pw' | 'Sd' | '60' | 'LostBall';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ShotDetail {
  club: GolfClub;
  location?: GeoLocation;
  timestamp: number;
  distance?: number; // Distance achieved in yards
}

export interface HoleScore {
  holeNumber: number;
  approachShots: number;
  putts: number;
  approachShotsDetails?: ShotDetail[];
  teeLocation?: GeoLocation;
}

export interface Round {
  id: string; // formato: dd-mm-yyyy
  date: Date;
  scores: Record<number, HoleScore>;
  currentHoleIndex: number;
  isFinished: boolean; // Marca si el jugador finalizó manualmente la rueda
}

export interface RoundMetadata {
  id: string;
  date: Date;
  totalScore: number;
  isComplete: boolean;
}

export type View = 'rounds' | 'play' | 'scorecard';
