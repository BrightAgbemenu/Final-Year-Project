import { describe, expect, it } from 'vitest';
import { mapSaveError, mapFetchError } from './errors';

describe('mapSaveError', () => {
  it('returns a generic message for a null error', () => {
    expect(mapSaveError(null)).toMatch(/could not save/i);
  });

  it('recognizes a stale schema cache by code', () => {
    expect(mapSaveError({ code: 'PGRST204' })).toMatch(/schema/i);
  });

  it('recognizes a stale schema cache by message', () => {
    expect(mapSaveError({ message: 'schema cache is stale' })).toMatch(/schema/i);
  });

  it('recognizes a network failure', () => {
    expect(mapSaveError({ message: 'Failed to fetch' })).toMatch(/internet/i);
  });

  it('recognizes an RLS/permission denial by message', () => {
    expect(mapSaveError({ message: 'new row violates policy' })).toMatch(/permission/i);
  });

  it('recognizes an RLS/permission denial by code', () => {
    expect(mapSaveError({ code: '42501' })).toMatch(/permission/i);
  });

  it('recognizes a unique constraint violation', () => {
    expect(mapSaveError({ code: '23505' })).toMatch(/already in use/i);
  });

  it('recognizes the total-cost-below-paid guard', () => {
    expect(
      mapSaveError({ message: 'Total cost cannot be less than the amount already paid.' })
    ).toMatch(/cannot be less than/i);
  });

  it('falls back to the raw message when nothing matches', () => {
    expect(mapSaveError({ message: 'some unexpected postgres error' })).toBe(
      'some unexpected postgres error'
    );
  });

  it('falls back to a generic message when there is no message', () => {
    expect(mapSaveError({})).toMatch(/could not save/i);
  });
});

describe('mapFetchError', () => {
  it('returns a generic message for a null error', () => {
    expect(mapFetchError(null)).toMatch(/went wrong/i);
  });

  it('recognizes a network failure', () => {
    expect(mapFetchError({ message: 'network request failed' })).toMatch(/internet/i);
  });

  it('recognizes an RLS/permission denial', () => {
    expect(mapFetchError({ message: 'permission denied for table' })).toMatch(/permission/i);
  });

  it('falls back to a generic message for anything else', () => {
    expect(mapFetchError({ message: 'weird error' })).toMatch(/went wrong/i);
  });
});
