import { describe, it, expect } from 'vitest';
import { DEFAULT_BAG, normalizeBag, addClubToBag, removeClubFromBag, moveClub } from '../bag';

describe('DEFAULT_BAG', () => {
  it('has 11 real clubs and no LostBall', () => {
    expect(DEFAULT_BAG).toHaveLength(11);
    expect(DEFAULT_BAG).not.toContain('LostBall');
    expect(DEFAULT_BAG).toEqual(['1w', '3w', '4i', '5i', '6i', '7i', '8i', '9i', 'Pw', 'Sd', '60']);
  });
});

describe('normalizeBag', () => {
  it('drops LostBall, de-duplicates, and preserves order', () => {
    expect(normalizeBag(['60', 'LostBall', '7i', '7i', '1w'])).toEqual(['60', '7i', '1w']);
  });

  it('returns an empty bag for an empty input', () => {
    expect(normalizeBag([])).toEqual([]);
  });

  it('preserves insertion order instead of re-sorting', () => {
    expect(normalizeBag(['Pw', '1w', '60', '3w'])).toEqual(['Pw', '1w', '60', '3w']);
  });

  it('drops LostBall even when it is the only input', () => {
    expect(normalizeBag(['LostBall'])).toEqual([]);
  });

  it('keeps custom clubs and preserves order', () => {
    expect(normalizeBag(['Hy', '7i', '1w', 'Dr', 'Hy'])).toEqual(['Hy', '7i', '1w', 'Dr']);
  });

  it('trims whitespace from club abbreviations', () => {
    expect(normalizeBag(['  5w  ', '1w'])).toEqual(['5w', '1w']);
  });

  it('drops empty strings', () => {
    expect(normalizeBag([''])).toEqual([]);
  });
});

describe('addClubToBag', () => {
  it('adds a missing club and appends to the end', () => {
    expect(addClubToBag(['1w', '7i'], '60')).toEqual(['1w', '7i', '60']);
  });

  it('is idempotent for a club already present', () => {
    expect(addClubToBag(['1w', '7i'], '7i')).toEqual(['1w', '7i']);
  });

  it('is a no-op when adding LostBall', () => {
    expect(addClubToBag(['1w', '7i'], 'LostBall')).toEqual(['1w', '7i']);
  });

  it('appends a custom club to the end', () => {
    expect(addClubToBag(['1w', '7i'], 'Hy')).toEqual(['1w', '7i', 'Hy']);
  });
});

describe('removeClubFromBag', () => {
  it('removes an existing club', () => {
    expect(removeClubFromBag(['1w', '7i', '60'], '7i')).toEqual(['1w', '60']);
  });

  it('is a no-op for an absent club', () => {
    expect(removeClubFromBag(['1w', '7i'], '60')).toEqual(['1w', '7i']);
  });

  it('preserves order after removal', () => {
    expect(removeClubFromBag(['60', '1w', '7i'], '1w')).toEqual(['60', '7i']);
  });

  it('removes a custom club', () => {
    expect(removeClubFromBag(['1w', '7i', 'Hy'], 'Hy')).toEqual(['1w', '7i']);
  });
});

describe('moveClub', () => {
  it('moves an item forward', () => {
    expect(moveClub(['1w', '3w', '5i'], 0, 2)).toEqual(['3w', '5i', '1w']);
  });

  it('moves an item backward', () => {
    expect(moveClub(['1w', '3w', '5i'], 2, 0)).toEqual(['5i', '1w', '3w']);
  });

  it('is a no-op when fromIndex equals toIndex', () => {
    expect(moveClub(['1w', '3w'], 0, 0)).toEqual(['1w', '3w']);
  });

  it('is a no-op when toIndex is out of bounds', () => {
    expect(moveClub(['1w', '3w'], 0, 5)).toEqual(['1w', '3w']);
  });

  it('is a no-op when fromIndex is negative', () => {
    expect(moveClub(['1w', '3w'], -1, 1)).toEqual(['1w', '3w']);
  });
});
