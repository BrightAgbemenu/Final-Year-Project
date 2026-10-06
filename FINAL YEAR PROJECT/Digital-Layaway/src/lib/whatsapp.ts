/**
 * Normalizes a Ghanaian phone number to the international digits-only format
 * WhatsApp's click-to-chat scheme expects (e.g. "024 123 4567" -> "233241234567").
 */
function normalizeGhanaPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;

  return null;
}

/**
 * Builds a WhatsApp click-to-chat URL that pre-fills a message. Opening it only
 * populates WhatsApp's compose screen — the user still has to press send themselves.
 * Returns null when no usable phone number is available, so callers can hide the action.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const normalized = normalizeGhanaPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
