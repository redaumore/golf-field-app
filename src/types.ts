export interface Hole {
  number: number;
  par: number;
  distance: number; // in yards or meters
  handicap?: number;
  greenCenter?: {
    latitude: number;
    longitude: number;
  };
  teeLocation?: {
    latitude: number;
    longitude: number;
  };
}

export type GolfClub = '1w' | '3w' | '4i' | '5i' | '6i' | '7i' | '8i' | '9i' | 'Pw' | 'Sd' | '60' | 'LostBall';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ShotDetail {
  club: GolfClub;
  location?: GeoLocation;
  timestamp: number;
  distance?: number; // Distance achieved in yards
  isRepresentative?: boolean; // true if the shot should be included in statistics
}

export interface HoleScore {
  holeNumber: number;
  approachShots: number;
  putts: number;
  approachShotsDetails?: ShotDetail[];
  teeLocation?: GeoLocation;
}

export interface GuestScore {
  approachShots: number;
  putts: number;
}

export interface GuestPlayer {
  id: string;
  name: string;
  scores: Record<number, GuestScore>;
}

export interface Round {
  id: string; // formato: dd-mm-yyyy
  date: Date;
  scores: Record<number, HoleScore>;
  currentHoleIndex: number;
  startingHoleNumber?: number; // Hoyo inicial de la ronda (1-18)
  isFinished: boolean; // Marca si el jugador finalizó manualmente la rueda
  guests?: GuestPlayer[];
}

export interface RoundMetadata {
  id: string;
  date: Date;
  totalScore: number;
  isComplete: boolean;
}

export type View = 'rounds' | 'play' | 'scorecard' | 'driving' | 'profile';

export interface DrivingShot {
  id: string;
  timestamp: number;
  direction: 'far-left' | 'left' | 'center' | 'right' | 'far-right';
}

export interface DrivingSession {
  id: string;
  date: Date;
  club: 'Driver' | 'Wood' | 'Long Iron' | 'Short Iron';
  shots: DrivingShot[];
  isFinished: boolean;
}

export interface ScoreDistribution {
  eaglesOrBetter: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  tripleBogeys: number;
  otherBogeys: number;
}

