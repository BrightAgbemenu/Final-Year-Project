import type { Profile } from '@/types/database';

export function formatGHS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return 'GHS 0.00';
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `GHS ${formatted}`;
}

export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'bg-primary-100', text: 'text-primary-700' },
  { bg: 'bg-accent-100', text: 'text-accent-700' },
  { bg: 'bg-success-100', text: 'text-success-700' },
  { bg: 'bg-warning-100', text: 'text-warning-700' },
] as const;

export function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** The name a client would recognize: business name if the artisan has set one, else their own name. */
export function getDisplayName(profile: Profile | null | undefined): string {
  return profile?.business_name || profile?.full_name || 'Your artisan';
}
