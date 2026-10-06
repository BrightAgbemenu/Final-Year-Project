import { describe, expect, it } from 'vitest';
import { createTestArtisan, createLayawayProfile, logPayment } from './helpers';

/**
 * The schema's own doc comments claim log_payment "prevents race conditions and
 * overpayment at the DB layer" by checking-then-inserting inside one atomic
 * transaction. This is the test that actually exercises that claim: two payments
 * fired at the same instant that would jointly overpay if the check-then-insert
 * weren't atomic (e.g. if both read the pre-payment balance before either wrote).
 */
describe('log_payment concurrency', () => {
  it('never lets two simultaneous payments jointly exceed total_cost', async () => {
    const artisan = await createTestArtisan('race');
    const profile = await createLayawayProfile(artisan.client, { total_cost: 100 });

    // Two payments of 60 fired together: individually valid, jointly an overpayment
    // by 20. If the RPC's check-then-write weren't atomic, both could read "0 paid
    // so far" and both succeed, landing at 120/100.
    const [first, second] = await Promise.allSettled([
      logPayment(artisan.client, profile.id, 60),
      logPayment(artisan.client, profile.id, 60),
    ]);

    const outcomes = [first, second].map((settled) => {
      if (settled.status === 'rejected') return { ok: false, message: String(settled.reason) };
      const { error } = settled.value;
      return { ok: !error, message: error?.message };
    });

    const succeeded = outcomes.filter((o) => o.ok);
    const failed = outcomes.filter((o) => !o.ok);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].message?.toLowerCase()).toContain('exceeds the outstanding balance');

    // The authoritative check: sum actual rows, not the RPC's return values.
    const { data: installments } = await artisan.client
      .from('installments')
      .select('amount')
      .eq('profile_id', profile.id)
      .is('voided_at', null);
    const totalPaid = (installments ?? []).reduce((sum, i) => sum + Number(i.amount), 0);
    expect(totalPaid).toBe(60);
    expect(totalPaid).toBeLessThanOrEqual(100);
  });

  it('lets two simultaneous payments both succeed when they jointly fit', async () => {
    const artisan = await createTestArtisan('race-fit');
    const profile = await createLayawayProfile(artisan.client, { total_cost: 100 });

    const [first, second] = await Promise.allSettled([
      logPayment(artisan.client, profile.id, 40),
      logPayment(artisan.client, profile.id, 40),
    ]);

    const bothOk = [first, second].every(
      (settled) => settled.status === 'fulfilled' && !settled.value.error
    );
    expect(bothOk).toBe(true);

    const { data: installments } = await artisan.client
      .from('installments')
      .select('amount')
      .eq('profile_id', profile.id)
      .is('voided_at', null);
    const totalPaid = (installments ?? []).reduce((sum, i) => sum + Number(i.amount), 0);
    expect(totalPaid).toBe(80);
  });
});
