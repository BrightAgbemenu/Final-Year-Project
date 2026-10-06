export type SupabaseError = { message?: string; code?: string };

export function mapSaveError(error: SupabaseError | null | undefined): string {
  if (!error) return 'Could not save your changes. Please try again.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('total cost cannot be less than')) {
    return 'Total cost cannot be less than the amount already paid on this record.';
  }
  if (error.code === 'PGRST204' || msg.includes('schema cache')) {
    return "The database hasn't picked up a recent update yet. In Supabase, run NOTIFY pgrst, 'reload schema'; or restart the project (Settings → General → Restart project), then try again.";
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not connect. Please check your internet and try again.';
  }
  if (msg.includes('permission') || msg.includes('policy') || error.code === '42501') {
    return 'You do not have permission to make this change.';
  }
  if (error.code === '23505') {
    return 'That value is already in use.';
  }
  return error.message || 'Could not save your changes. Please try again.';
}

export function mapFetchError(error: SupabaseError | null | undefined): string {
  if (!error) return 'Something went wrong while loading your data.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not connect. Please check your internet and try again.';
  }
  if (msg.includes('permission') || msg.includes('policy') || error.code === '42501') {
    return 'You do not have permission to view this data.';
  }
  return 'Something went wrong while loading your data. Please try again.';
}
