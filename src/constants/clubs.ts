import type { GolfClub } from '../types';

// The 11 real clubs a player can carry, in canonical bag order.
export const REAL_CLUBS: GolfClub[] = ['1w', '3w', '4i', '5i', '6i', '7i', '8i', '9i', 'Pw', 'Sd', '60'];

// Every selectable club during play: the real clubs plus the LostBall penalty marker.
export const ALL_CLUBS: GolfClub[] = [...REAL_CLUBS, 'LostBall'];
