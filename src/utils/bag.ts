import type { GolfClub } from '../types';
import { REAL_CLUBS } from '../constants/clubs';

// The bag a new player starts with: every real club from the catalog.
export const DEFAULT_BAG: GolfClub[] = [...REAL_CLUBS];

// Normalizes the bag while PRESERVING order: trims, drops 'LostBall' and empty
// strings, and de-duplicates keeping the first occurrence. Order is
// user-controlled (drag-and-drop), so it is never re-sorted here.
export function normalizeBag(clubs: GolfClub[]): GolfClub[] {
  const seen = new Set<GolfClub>();
  const result: GolfClub[] = [];
  for (const raw of clubs) {
    const club = raw.trim();
    if (club.length === 0 || club === 'LostBall') continue;
    if (seen.has(club)) continue;
    seen.add(club);
    result.push(club);
  }
  return result;
}

// Appends a club to the end of the bag (de-duplicating). New clubs land at the
// end; the user repositions them via drag-and-drop.
export function addClubToBag(bag: GolfClub[], club: GolfClub): GolfClub[] {
  return normalizeBag([...bag, club]);
}

export function removeClubFromBag(bag: GolfClub[], club: GolfClub): GolfClub[] {
  return normalizeBag(bag.filter((c) => c !== club));
}

// Moves the club at `fromIndex` to `toIndex` (both 0-based). Returns the same
// array reference if the move is a no-op or either index is out of bounds.
export function moveClub(bag: GolfClub[], fromIndex: number, toIndex: number): GolfClub[] {
  if (fromIndex === toIndex) return bag;
  if (fromIndex < 0 || fromIndex >= bag.length) return bag;
  if (toIndex < 0 || toIndex >= bag.length) return bag;
  const next = [...bag];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
