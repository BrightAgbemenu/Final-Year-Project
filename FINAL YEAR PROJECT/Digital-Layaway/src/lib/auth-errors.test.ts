import { describe, expect, it } from 'vitest';
import { mapAuthError, mapPaymentError } from './auth-errors';

describe('mapAuthError', () => {
  it('returns a generic message for a null error', () => {
    expect(mapAuthError(null)).toMatch(/went wrong/i);
  });

  it('returns a generic message when the message is missing', () => {
    expect(mapAuthError({})).toMatch(/went wrong/i);
  });

  it('recognizes invalid credentials', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toMatch(
      /incorrect/i
    );
  });

  it('recognizes a duplicate signup', () => {
    expect(mapAuthError({ message: 'User already registered' })).toMatch(/already exists/i);
  });

  it('recognizes an unconfirmed email', () => {
    expect(mapAuthError({ message: 'Email not confirmed' })).toMatch(/confirm your account/i);
  });

  it('recognizes a too-short password', () => {
    expect(mapAuthError({ message: 'Password should be at least 6 characters' })).toMatch(
      /at least 6 characters/i
    );
  });

  it('recognizes rate limiting', () => {
    expect(mapAuthError({ message: 'rate limit exceeded' })).toMatch(/too many attempts/i);
  });

  it('recognizes a network failure', () => {
    expect(mapAuthError({ message: 'Failed to fetch' })).toMatch(/internet/i);
  });

  it('falls back to the raw message when nothing matches', () => {
    expect(mapAuthError({ message: 'a completely novel error' })).toBe('a completely novel error');
  });
});

describe('mapPaymentError', () => {
  it('returns a generic message for a null error', () => {
    expect(mapPaymentError(null)).toMatch(/could not record/i);
  });

  it('recognizes an overpayment rejection', () => {
    expect(
      mapPaymentError({ message: 'Payment of GHS 500 exceeds the outstanding balance of GHS 200.' })
    ).toMatch(/more than the remaining balance/i);
  });

  it('recognizes a zero/negative amount rejection', () => {
    expect(mapPaymentError({ message: 'Payment amount must be greater than zero.' })).toMatch(
      /greater than zero/i
    );
  });

  it('recognizes a missing profile', () => {
    expect(mapPaymentError({ message: 'This layaway profile does not exist.' })).toMatch(
      /could not be found/i
    );
  });

  it('recognizes an ownership rejection', () => {
    expect(
      mapPaymentError({ message: 'You do not have permission to log payments for this profile.' })
    ).toMatch(/do not have permission/i);
  });

  it('recognizes a network failure', () => {
    expect(mapPaymentError({ message: 'network error' })).toMatch(/internet/i);
  });

  it('falls back to the raw message when nothing matches', () => {
    expect(mapPaymentError({ message: 'a completely novel error' })).toBe(
      'a completely novel error'
    );
  });
});
