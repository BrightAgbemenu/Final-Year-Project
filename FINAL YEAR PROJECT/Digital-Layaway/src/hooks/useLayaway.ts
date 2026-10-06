import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { LayawayWithTotals, Installment } from '@/types/database';

export function useLayawayProfiles() {
  const [profiles, setProfiles] = useState<LayawayWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('layaway_profiles')
      .select(
        `id, artisan_id, client_name, client_phone, item_description, total_cost,
         created_at, updated_at,
         installments(amount, payment_date)`
      )
      .is('installments.voided_at', null)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const enriched: LayawayWithTotals[] = (data || []).map((row) => {
      const installments =
        (row.installments as unknown as { amount: number; payment_date: string }[]) || [];
      const totalPaid = installments.reduce((sum, i) => sum + Number(i.amount), 0);
      return {
        id: row.id,
        artisan_id: row.artisan_id,
        client_name: row.client_name,
        client_phone: row.client_phone,
        item_description: row.item_description,
        total_cost: Number(row.total_cost),
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_paid: totalPaid,
        balance: Number(row.total_cost) - totalPaid,
        installment_count: installments.length,
        payments: installments.map((i) => ({ amount: Number(i.amount), payment_date: i.payment_date })),
      };
    });

    setProfiles(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, error, refetch: fetchProfiles };
}

export function useLayawayProfile(id: string | undefined) {
  const [profile, setProfile] = useState<LayawayWithTotals | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [profileRes, installmentsRes] = await Promise.all([
      supabase
        .from('layaway_profiles')
        .select(
          `id, artisan_id, client_name, client_phone, item_description, total_cost,
           created_at, updated_at,
           installments(amount)`
        )
        .is('installments.voided_at', null)
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('installments')
        .select('*')
        .eq('profile_id', id)
        .is('voided_at', null)
        .order('payment_date', { ascending: false }),
    ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
      setLoading(false);
      return;
    }
    if (installmentsRes.error) {
      setError(installmentsRes.error.message);
      setLoading(false);
      return;
    }

    if (!profileRes.data) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const row = profileRes.data;
    const amounts = (row.installments as unknown as { amount: number }[]) || [];
    const totalPaid = amounts.reduce((sum, i) => sum + Number(i.amount), 0);
    const fetchedInstallments = (installmentsRes.data as Installment[]) || [];

    setProfile({
      id: row.id,
      artisan_id: row.artisan_id,
      client_name: row.client_name,
      client_phone: row.client_phone,
      item_description: row.item_description,
      total_cost: Number(row.total_cost),
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_paid: totalPaid,
      balance: Number(row.total_cost) - totalPaid,
      installment_count: amounts.length,
      payments: fetchedInstallments.map((i) => ({
        amount: Number(i.amount),
        payment_date: i.payment_date,
      })),
    });

    setInstallments(fetchedInstallments);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    profile,
    installments,
    loading,
    error,
    refetch: fetchAll,
  };
}
