import type { SupabaseError } from '@/lib/errors';

export function mapAuthError(error: { message?: string } | null | undefined): string {
  if (!error || !error.message) return 'Something went wrong. Please try again.';
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'The email or password you entered is incorrect. Please try again.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please check your email and confirm your account before signing in.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not connect. Please check your internet and try again.';
  }
  return error.message;
}

export function mapPaymentError(error: SupabaseError | null | undefined): string {
  if (!error) return 'Could not record this payment. Please try again.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('exceeds the outstanding balance') || msg.includes('overpay')) {
    return 'This payment is more than the remaining balance. Please enter a lower amount.';
  }
  if (msg.includes('greater than zero') || msg.includes('must be greater')) {
    return 'Payment amount must be greater than zero.';
  }
  if (msg.includes('does not exist')) {
    return 'This layaway record could not be found.';
  }
  if (msg.includes('permission') || msg.includes('do not have')) {
    return 'You do not have permission to record payments for this client.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not connect. Please check your internet and try again.';
  }
  return error.message || 'Could not record this payment. Please try again.';
}
