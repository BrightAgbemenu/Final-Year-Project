import { describe, expect, it } from 'vitest';
import {
  formatGHS,
  formatNumber,
  parseAmount,
  getInitials,
  getAvatarColor,
  getDisplayName,
} from './format';

describe('formatGHS', () => {
  it('formats a normal amount with two decimals and thousands separators', () => {
    expect(formatGHS(1234.5)).toBe('GHS 1,234.50');
  });

  it('formats zero', () => {
    expect(formatGHS(0)).toBe('GHS 0.00');
  });

  it.each([null, undefined, NaN])('falls back to GHS 0.00 for %s', (value) => {
    expect(formatGHS(value)).toBe('GHS 0.00');
  });
});

describe('formatNumber', () => {
  it('formats without the GHS prefix', () => {
    expect(formatNumber(1234.5)).toBe('1,234.50');
  });

  it.each([null, undefined, NaN])('falls back to 0.00 for %s', (value) => {
    expect(formatNumber(value)).toBe('0.00');
  });
});

describe('parseAmount', () => {
  it('parses a plain numeric string', () => {
    expect(parseAmount('123.45')).toBe(123.45);
  });

  it('strips non-numeric characters', () => {
    expect(parseAmount('GHS 1,234.50')).toBe(1234.5);
  });

  it('returns 0 for unparseable input', () => {
    expect(parseAmount('abc')).toBe(0);
  });

  it('returns 0 for an empty string', () => {
    expect(parseAmount('')).toBe(0);
  });
});

describe('getInitials', () => {
  it('takes the first letter of the first and last name', () => {
    expect(getInitials('Kofi Asante')).toBe('KA');
  });

  it('takes the first two letters of a single name', () => {
    expect(getInitials('Ama')).toBe('AM');
  });

  it('collapses extra whitespace between names', () => {
    expect(getInitials('  Kofi   Asante  ')).toBe('KA');
  });

  it('uses only the first and last of three or more names', () => {
    expect(getInitials('Kofi Yaw Asante')).toBe('KA');
  });

  it('returns ? for an empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns ? for a whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getAvatarColor', () => {
  it('is deterministic for the same name', () => {
    expect(getAvatarColor('Kofi Asante')).toEqual(getAvatarColor('Kofi Asante'));
  });

  it('returns one of the defined color pairs', () => {
    const { bg, text } = getAvatarColor('Ama Mensah');
    expect(bg).toMatch(/^bg-/);
    expect(text).toMatch(/^text-/);
  });

  it('handles an empty string without throwing', () => {
    expect(() => getAvatarColor('')).not.toThrow();
  });
});

describe('getDisplayName', () => {
  it('prefers business_name over full_name', () => {
    expect(
      getDisplayName({
        id: '1',
        full_name: 'Ama Mensah',
        business_name: "Ama's Fashion House",
        phone: null,
        created_at: '',
      })
    ).toBe("Ama's Fashion House");
  });

  it('falls back to full_name when no business_name is set', () => {
    expect(
      getDisplayName({ id: '1', full_name: 'Ama Mensah', business_name: null, phone: null, created_at: '' })
    ).toBe('Ama Mensah');
  });

  it('falls back to a generic label when neither is set', () => {
    expect(
      getDisplayName({ id: '1', full_name: null, business_name: null, phone: null, created_at: '' })
    ).toBe('Your artisan');
  });

  it('falls back to a generic label for a null profile', () => {
    expect(getDisplayName(null)).toBe('Your artisan');
  });
});
