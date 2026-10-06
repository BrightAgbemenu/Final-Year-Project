import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ReceiptText, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { mapFetchError } from '@/lib/errors';
import { formatGHS, formatDateTime } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Spinner';
import { ReceiptModal } from '@/components/ReceiptModal';
import type { Installment, LayawayProfile } from '@/types/database';

type ReceiptRow = {
  installment: Installment;
  layaway: LayawayProfile;
  balanceAfter: number;
  totalPaidBefore: number;
};

export function HistoryPage() {
  const navigate = useNavigate();
  const { profile: artisan } = useAuth();
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReceiptRow | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: layaways, error: layawaysError } = await supabase
      .from('layaway_profiles')
      .select('id, client_name, client_phone, item_description, total_cost, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (layawaysError) {
      setError(layawaysError.message);
      setLoading(false);
      return;
    }

    const profileIds = (layaways || []).map((l) => l.id);
    if (profileIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('*')
      .in('profile_id', profileIds)
      .is('voided_at', null)
      .order('payment_date', { ascending: false });

    if (installmentsError) {
      setError(installmentsError.message);
      setLoading(false);
      return;
    }

    const layawayMap = new Map<string, LayawayProfile>();
    (layaways || []).forEach((l) =>
      layawayMap.set(l.id, {
        ...l,
        artisan_id: '',
        total_cost: Number(l.total_cost),
      } as LayawayProfile)
    );

    // Compute running totals per profile
    const totals = new Map<string, number>();
    const enriched: ReceiptRow[] = (installments || []).map((inst) => {
      const layaway = layawayMap.get(inst.profile_id)!;
      const prevTotal = totals.get(inst.profile_id) ?? 0;
      const newTotal = prevTotal + Number(inst.amount);
      totals.set(inst.profile_id, newTotal);
      return {
        installment: inst as Installment,
        layaway,
        balanceAfter: Number(layaway.total_cost) - newTotal,
        totalPaidBefore: newTotal,
      };
    });

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalReceived = rows.reduce((sum, r) => sum + Number(r.installment.amount), 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="font-serif text-2xl font-bold text-ink-900">Payment history</h1>
        <p className="text-sm text-ink-500">Every payment you have received, newest first.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="Couldn't load your payment history"
            description={mapFetchError({ message: error })}
            action={
              <button onClick={() => fetchHistory()} className="btn-primary">
                Try again
              </button>
            }
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ReceiptText className="h-8 w-8" />}
            title="No payments recorded yet"
            description="Once you start logging instalments for your clients, every receipt will appear here."
            action={
              <button onClick={() => navigate('/')} className="btn-primary">
                Go to dashboard
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Total received
            </p>
            <p className="mt-1 font-serif text-2xl font-bold tabular text-primary-700">
              {formatGHS(totalReceived)}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{rows.length} payments across all clients</p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((row) => (
              <button
                key={row.installment.id}
                onClick={() => setSelected(row)}
                className="card flex w-full items-center gap-3 p-4 text-left transition-all duration-200 hover:shadow-elevated active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-ink-900">{row.layaway.client_name}</p>
                    <p className="shrink-0 font-semibold tabular text-primary-700">
                      {formatGHS(row.installment.amount)}
                    </p>
                  </div>
                  <p className="truncate text-xs text-ink-500">{row.layaway.item_description}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-ink-500">
                      {row.installment.receipt_no}
                    </span>
                    <span className="text-[10px] text-ink-500">
                      {formatDateTime(row.installment.payment_date)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" />
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <ReceiptModal
          open={!!selected}
          onClose={() => setSelected(null)}
          artisan={artisan}
          layaway={selected.layaway}
          installment={selected.installment}
          balanceAfter={selected.balanceAfter}
          totalPaid={selected.totalPaidBefore}
        />
      )}
    </div>
  );
}
