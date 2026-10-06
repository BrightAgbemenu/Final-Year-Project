import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (see .env) to run integration tests.'
  );
}

// Every account these tests create uses this domain so they're trivially identifiable
// for bulk cleanup afterward (these tests only hold the anon key, same as the shipped
// app, so they cannot delete auth.users themselves — that needs a service-role key or
// direct SQL access, deliberately kept out of this test harness's credential surface).
export const TEST_EMAIL_DOMAIN = 'integration-test.ledgerpay.invalid';

let counter = 0;

export function makeClient(): SupabaseClient {
  return createClient(url as string, anonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function createTestArtisan(label: string) {
  const client = makeClient();
  counter += 1;
  const email = `it-${Date.now()}-${counter}-${label}@${TEST_EMAIL_DOMAIN}`;
  const password = 'Integration-Test-Pass-1!';

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: label } },
  });
  if (error) throw new Error(`signUp failed for ${label}: ${error.message}`);
  if (!data.session) {
    throw new Error(
      `signUp for ${label} did not return a session. This harness assumes email ` +
        'confirmation is disabled on the project (matching how the real app behaves ' +
        'on signup); if that changes, these tests need a different auth strategy.'
    );
  }

  return { client, email, userId: data.user!.id };
}

export async function createLayawayProfile(
  client: SupabaseClient,
  overrides: Partial<{ client_name: string; item_description: string; total_cost: number }> = {}
) {
  const { data, error } = await client
    .from('layaway_profiles')
    .insert({
      client_name: overrides.client_name ?? 'Test Client',
      item_description: overrides.item_description ?? 'Test item',
      total_cost: overrides.total_cost ?? 1000,
    })
    .select('*')
    .single();
  if (error) throw new Error(`createLayawayProfile failed: ${error.message}`);
  return data as {
    id: string;
    artisan_id: string;
    client_name: string;
    item_description: string;
    total_cost: number;
  };
}

export type LogPaymentResult = {
  new_balance: number;
  installment_id: string;
  receipt_no: string;
  total_paid: number;
  total_cost: number;
};

export async function logPayment(
  client: SupabaseClient,
  profileId: string,
  amount: number,
  note: string | null = null
) {
  return client.rpc('log_payment', {
    p_profile_uuid: profileId,
    p_amount: amount,
    p_note: note,
  });
}
