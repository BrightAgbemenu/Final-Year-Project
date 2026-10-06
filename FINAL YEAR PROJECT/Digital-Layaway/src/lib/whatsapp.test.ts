import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink } from './whatsapp';

describe('buildWhatsAppLink', () => {
  it('returns null for a missing phone', () => {
    expect(buildWhatsAppLink(null, 'hi')).toBeNull();
    expect(buildWhatsAppLink(undefined, 'hi')).toBeNull();
    expect(buildWhatsAppLink('', 'hi')).toBeNull();
  });

  it('normalizes a local 0-prefixed number to international format', () => {
    const link = buildWhatsAppLink('0241234567', 'hi');
    expect(link).toContain('wa.me/233241234567');
  });

  it('normalizes a 9-digit number without the leading 0', () => {
    const link = buildWhatsAppLink('241234567', 'hi');
    expect(link).toContain('wa.me/233241234567');
  });

  it('accepts an already-international number unchanged', () => {
    const link = buildWhatsAppLink('233241234567', 'hi');
    expect(link).toContain('wa.me/233241234567');
  });

  it('strips formatting characters (spaces, dashes, parens, +)', () => {
    const link = buildWhatsAppLink('+233 (24) 123-4567', 'hi');
    expect(link).toContain('wa.me/233241234567');
  });

  it('rejects a number that is too short', () => {
    expect(buildWhatsAppLink('12345', 'hi')).toBeNull();
  });

  it('rejects a number that is too long', () => {
    expect(buildWhatsAppLink('1234567890123', 'hi')).toBeNull();
  });

  it('rejects a non-Ghana-shaped international number', () => {
    // 10 digits starting with something other than 0, not 9 digits, not 233-prefixed-12.
    expect(buildWhatsAppLink('1234567890', 'hi')).toBeNull();
  });

  it('URL-encodes the message', () => {
    const link = buildWhatsAppLink('0241234567', 'Hello! Balance: GHS 100 & rising');
    expect(link).toContain(encodeURIComponent('Hello! Balance: GHS 100 & rising'));
  });
});
