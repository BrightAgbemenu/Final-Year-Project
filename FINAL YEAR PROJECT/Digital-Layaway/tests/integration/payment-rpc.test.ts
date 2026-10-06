import { beforeAll, describe, expect, it } from 'vitest';
import { createTestArtisan, createLayawayProfile, logPayment, type LogPaymentResult } from './helpers';

describe('log_payment edge cases', () => {
  let client: Awaited<ReturnType<typeof createTestArtisan>>['client'];
  let profileId: string;

  beforeAll(async () => {
    const artisan = await createTestArtisan('rpc');
    client = artisan.client;
    const profile = await createLayawayProfile(client, { total_cost: 200 });
    profileId = profile.id;
  });

  it('rejects a zero amount', async () => {
    const { data, error } = await logPayment(client, profileId, 0);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('greater than zero');
  });

  it('rejects a negative amount', async () => {
    const { data, error } = await logPayment(client, profileId, -50);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('greater than zero');
  });

  it('rejects a payment against a nonexistent profile', async () => {
    const { data, error } = await logPayment(client, '00000000-0000-0000-0000-000000000000', 10);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('does not exist');
  });

  it('accepts a valid partial payment and returns the correct balance', async () => {
    const { data, error } = await logPayment(client, profileId, 80, 'first payment');
    expect(error).toBeNull();
    const result = (Array.isArray(data) ? data[0] : data) as LogPaymentResult;
    expect(result.total_paid).toBe(80);
    expect(result.new_balance).toBe(120);
    expect(result.total_cost).toBe(200);
    expect(result.receipt_no).toMatch(/^LAY-\d{8}-\d{4}$/);
  });

  it('rejects a payment that would exceed the remaining balance', async () => {
    // 120 remains; 150 would overpay.
    const { data, error } = await logPayment(client, profileId, 150);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('exceeds the outstanding balance');
  });

  it('accepts a payment that exactly clears the remaining balance', async () => {
    const { data, error } = await logPayment(client, profileId, 120, 'final payment');
    expect(error).toBeNull();
    const result = (Array.isArray(data) ? data[0] : data) as LogPaymentResult;
    expect(result.total_paid).toBe(200);
    expect(result.new_balance).toBe(0);
  });

  it('rejects any further payment once fully paid', async () => {
    const { data, error } = await logPayment(client, profileId, 1);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('generates a unique receipt_no per payment', async () => {
    const profile = await createLayawayProfile(client, { total_cost: 1000 });
    const receipts = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const { data, error } = await logPayment(client, profile.id, 10);
      expect(error).toBeNull();
      const result = (Array.isArray(data) ? data[0] : data) as LogPaymentResult;
      receipts.add(result.receipt_no);
    }
    expect(receipts.size).toBe(3);
  });
});

describe('total_cost cannot be reduced below what has been paid', () => {
  let client: Awaited<ReturnType<typeof createTestArtisan>>['client'];
  let profileId: string;

  beforeAll(async () => {
    const artisan = await createTestArtisan('guard');
    client = artisan.client;
    const profile = await createLayawayProfile(client, { total_cost: 500 });
    profileId = profile.id;
    const { error } = await logPayment(client, profileId, 300);
    if (error) throw error;
  });

  it('rejects lowering total_cost below the amount already paid', async () => {
    const { error } = await client
      .from('layaway_profiles')
      .update({ total_cost: 200 }) // below the 300 already paid
      .eq('id', profileId);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('cannot be less than');
  });

  it('accepts lowering total_cost to exactly the amount paid', async () => {
    const { error } = await client
      .from('layaway_profiles')
      .update({ total_cost: 300 })
      .eq('id', profileId);
    expect(error).toBeNull();
  });

  it('leaves unrelated edits (e.g. name) unaffected by the guard', async () => {
    const { error } = await client
      .from('layaway_profiles')
      .update({ client_name: 'Renamed Client' })
      .eq('id', profileId);
    expect(error).toBeNull();
  });
});

describe('void_installment', () => {
  let client: Awaited<ReturnType<typeof createTestArtisan>>['client'];
  let profileId: string;
  let installmentId: string;

  beforeAll(async () => {
    const artisan = await createTestArtisan('void');
    client = artisan.client;
    const profile = await createLayawayProfile(client, { total_cost: 500 });
    profileId = profile.id;
    const { data, error } = await logPayment(client, profileId, 200);
    if (error || !data) throw new Error(error?.message);
    installmentId = (Array.isArray(data) ? data[0] : data).installment_id;
  });

  it('soft-deletes the installment and recalculates the balance', async () => {
    const { data, error } = await client.rpc('void_installment', {
      p_installment_id: installmentId,
      p_reason: 'test void',
    });
    expect(error).toBeNull();
    const result = Array.isArray(data) ? data[0] : data;
    expect(result.total_paid).toBe(0);
    expect(result.new_balance).toBe(500);

    // The row must still exist — this is the whole point of the fix: it's voided,
    // not gone.
    const { data: row } = await client
      .from('installments')
      .select('voided_at, void_reason, amount')
      .eq('id', installmentId)
      .single();
    expect(row?.voided_at).not.toBeNull();
    expect(row?.void_reason).toBe('test void');
    expect(row?.amount).toBe(200); // amount is preserved, not zeroed
  });

  it('rejects voiding the same installment twice', async () => {
    const { data, error } = await client.rpc('void_installment', {
      p_installment_id: installmentId,
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain('already been removed');
  });

  it('rejects voiding a nonexistent installment', async () => {
    const { data, error } = await client.rpc('void_installment', {
      p_installment_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('a voided installment no longer counts toward the balance for a new payment', async () => {
    // Balance is back to 500 after the void above; a fresh 500 payment should now
    // fully clear it rather than overpaying against a stale total.
    const { data, error } = await logPayment(client, profileId, 500);
    expect(error).toBeNull();
    const result = (Array.isArray(data) ? data[0] : data) as { new_balance: number };
    expect(result.new_balance).toBe(0);
  });
});
