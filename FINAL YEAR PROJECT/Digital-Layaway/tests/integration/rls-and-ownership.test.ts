import { beforeAll, describe, expect, it } from 'vitest';
import { createTestArtisan, createLayawayProfile, logPayment } from './helpers';

/**
 * Verifies the exact scenario the project plan calls out under "Security Stress
 * Test": authenticate as one artisan, try to reach another artisan's data, confirm
 * RLS blocks it. This can only be tested meaningfully against the real database —
 * a mock would just assert whatever we told it to.
 */
describe('cross-tenant isolation', () => {
  let artisanA: Awaited<ReturnType<typeof createTestArtisan>>;
  let artisanB: Awaited<ReturnType<typeof createTestArtisan>>;
  let profileA: Awaited<ReturnType<typeof createLayawayProfile>>;
  let installmentAId: string;

  beforeAll(async () => {
    artisanA = await createTestArtisan('rls-a');
    artisanB = await createTestArtisan('rls-b');
    profileA = await createLayawayProfile(artisanA.client, { total_cost: 500 });

    const { data, error } = await logPayment(artisanA.client, profileA.id, 100, 'seed payment');
    if (error || !data) throw new Error(`seed payment failed: ${error?.message}`);
    installmentAId = (Array.isArray(data) ? data[0] : data).installment_id;
  });

  it("A can read their own profile", async () => {
    const { data, error } = await artisanA.client
      .from('layaway_profiles')
      .select('*')
      .eq('id', profileA.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(profileA.id);
  });

  it("B's SELECT on A's layaway_profiles row returns nothing, not an error", async () => {
    const { data, error } = await artisanB.client
      .from('layaway_profiles')
      .select('*')
      .eq('id', profileA.id)
      .maybeSingle();
    // RLS makes the row invisible rather than throwing — a client that only checked
    // for `error` and ignored a null/empty result would wrongly assume success.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("B cannot see A's installments", async () => {
    const { data, error } = await artisanB.client
      .from('installments')
      .select('*')
      .eq('profile_id', profileA.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("B cannot see A's profiles row", async () => {
    const { data, error } = await artisanB.client
      .from('profiles')
      .select('*')
      .eq('id', artisanA.userId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("B's UPDATE on A's layaway_profiles row affects zero rows", async () => {
    const { data, error } = await artisanB.client
      .from('layaway_profiles')
      .update({ client_name: 'Hijacked' })
      .eq('id', profileA.id)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Confirm it genuinely wasn't touched, from A's own (authoritative) view.
    const { data: stillA } = await artisanA.client
      .from('layaway_profiles')
      .select('client_name')
      .eq('id', profileA.id)
      .single();
    expect(stillA?.client_name).toBe('Test Client');
  });

  it("B's DELETE on A's layaway_profiles row affects zero rows", async () => {
    const { error } = await artisanB.client
      .from('layaway_profiles')
      .delete()
      .eq('id', profileA.id);
    expect(error).toBeNull();

    const { data: stillExists } = await artisanA.client
      .from('layaway_profiles')
      .select('id')
      .eq('id', profileA.id)
      .maybeSingle();
    expect(stillExists?.id).toBe(profileA.id);
  });

  it('B cannot log a payment against a profile they do not own', async () => {
    const { data, error } = await logPayment(artisanB.client, profileA.id, 50);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('permission');
  });

  it('B cannot void an installment belonging to A', async () => {
    const { data, error } = await artisanB.client.rpc('void_installment', {
      p_installment_id: installmentAId,
      p_reason: 'attempted hijack',
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('permission');

    // And it must genuinely still be active from A's perspective.
    const { data: stillActive } = await artisanA.client
      .from('installments')
      .select('voided_at')
      .eq('id', installmentAId)
      .single();
    expect(stillActive?.voided_at).toBeNull();
  });

  it('a direct INSERT into installments is rejected (payments must go through log_payment)', async () => {
    const { error } = await artisanA.client.from('installments').insert({
      profile_id: profileA.id,
      amount: 10,
    });
    expect(error).not.toBeNull();
  });
});
