import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Wallet,
  Plus,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Pencil,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useLayawayProfile } from '@/hooks/useLayaway';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { mapPaymentError } from '@/lib/auth-errors';
import { mapFetchError, type SupabaseError } from '@/lib/errors';
import { formatGHS, formatDateTime, getDisplayName, getInitials } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { Spinner, DetailSkeleton } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReceiptModal } from '@/components/ReceiptModal';
import { EditClientModal } from '@/components/EditClientModal';
import type { Installment, LogPaymentResult } from '@/types/database';

const paymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'Enter an amount greater than zero')
    .refine((v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n > 0;
    }, 'Enter an amount greater than zero'),
  note: z.string().max(200, 'Note is too long').optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

const PAYMENT_METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Other'];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: artisan } = useAuth();
  const { showToast } = useToast();
  const { profile, installments, loading, error, refetch } = useLayawayProfile(id);

  const [submitting, setSubmitting] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    installment: Installment;
    result: LogPaymentResult;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema) as never,
    mode: 'onChange',
    defaultValues: { amount: '', note: '' },
  });

  const watchedAmount = watch('amount');
  const watchedNote = watch('note');
  const currentAmount = parseFloat(watchedAmount) || 0;
  const balance = profile?.balance ?? 0;
  const overpayment = currentAmount > balance;
  const wouldExceed = overpayment && balance > 0;

  const canSubmit = useMemo(
    () => currentAmount > 0 && !overpayment && !submitting && balance > 0,
    [currentAmount, overpayment, submitting, balance]
  );

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          icon={<AlertCircle className="h-8 w-8" />}
          title="Couldn't load this client"
          description={mapFetchError({ message: error })}
          action={
            <button onClick={() => refetch()} className="btn-primary">
              Try again
            </button>
          }
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <EmptyState
          icon={<AlertCircle className="h-8 w-8" />}
          title="Client not found"
          description="This layaway record may have been deleted, or you don't have access to it."
          action={
            <button onClick={() => navigate('/')} className="btn-primary">
              Back to dashboard
            </button>
          }
        />
      </div>
    );
  }

  const isComplete = profile.balance <= 0;
  const percent = Math.min((profile.total_paid / profile.total_cost) * 100, 100);
  const reminderMessage = `Hi ${profile.client_name}, a friendly reminder that your outstanding balance for ${profile.item_description} is ${formatGHS(profile.balance)}. Thank you! — ${getDisplayName(artisan)}, via LedgerPay`;
  const whatsappReminderLink = buildWhatsAppLink(profile.client_phone, reminderMessage);

  const onSubmit = async (data: PaymentForm) => {
    const amount = parseFloat(data.amount);
    if (amount > balance) {
      showToast('This payment exceeds the remaining balance.', 'error');
      return;
    }
    setSubmitting(true);
    const { data: result, error: rpcError } = await supabase.rpc('log_payment', {
      p_profile_uuid: id,
      p_amount: amount,
      p_note: data.note || null,
    });

    if (rpcError || !result || (Array.isArray(result) && result.length === 0)) {
      setSubmitting(false);
      showToast(mapPaymentError(rpcError as SupabaseError | null), 'error');
      return;
    }

    const rpcResult = (Array.isArray(result) ? result[0] : result) as LogPaymentResult;

    const { data: newInstallment } = await supabase
      .from('installments')
      .select('*')
      .eq('id', rpcResult.installment_id)
      .maybeSingle();

    setSubmitting(false);
    reset({ amount: '', note: '' });

    if (newInstallment) {
      setLastPayment({ installment: newInstallment as Installment, result: rpcResult });
      setReceiptOpen(true);
    }

    showToast('Payment recorded successfully.', 'success');
    refetch();
  };

  const handleDeletePayment = async () => {
    if (!lastPayment) return;
    const { error: voidError } = await supabase.rpc('void_installment', {
      p_installment_id: lastPayment.installment.id,
    });

    setConfirmDelete(false);

    if (voidError) {
      showToast(voidError.message || 'Could not remove this payment. Please try again.', 'error');
      return;
    }

    showToast('Payment removed.', 'info');
    setLastPayment(null);
    refetch();
  };

  const handleDeleteClient = async () => {
    setDeletingClient(true);
    const { error: deleteError } = await supabase.from('layaway_profiles').delete().eq('id', id);
    setDeletingClient(false);
    setConfirmDeleteClient(false);

    if (deleteError) {
      showToast('Could not remove this client. Please try again.', 'error');
      return;
    }

    showToast('Client removed.', 'info');
    navigate('/');
  };

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink-600 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </button>

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-5">
      <div className="space-y-5 lg:col-span-2">
      {/* Profile header card */}
      <div className="card overflow-hidden p-0">
        <div className="bg-primary-700 px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500/40 text-base font-bold ring-1 ring-white/20">
              {getInitials(profile.client_name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-xl font-bold">{profile.client_name}</h1>
              <p className="truncate text-sm text-primary-200">{profile.item_description}</p>
            </div>
            {isComplete && (
              <span className="shrink-0 rounded-full bg-success-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                Paid off
              </span>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="shrink-0 rounded-lg p-2 text-primary-100 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Edit client"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {profile.client_phone && (
            <div className="mb-3 flex items-center gap-2 text-sm text-ink-600">
              <Phone className="h-4 w-4 text-ink-400" />
              {profile.client_phone}
            </div>
          )}

          {/* Balance hero */}
          <div className="rounded-2xl border border-paper-200 bg-paper-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Outstanding Balance
            </p>
            <p
              className={`mt-1 font-serif text-3xl font-bold tabular ${
                isComplete ? 'text-success-600' : 'text-ink-900'
              }`}
            >
              {formatGHS(profile.balance)}
            </p>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-success-500' : 'bg-primary-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-500">
              <span className="tabular">{formatGHS(profile.total_paid)} paid</span>
              <span className="tabular">{formatGHS(profile.total_cost)} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment form */}
      {!isComplete ? (
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-ink-800">
            <Plus className="h-5 w-5 text-primary-600" /> Record a payment
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="amount" className="label-text">Amount received (GHS)</label>
              <div className="relative">
                <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="input-field pl-11 tabular"
                  {...register('amount')}
                />
              </div>
              {errors.amount ? (
                <p className="field-error">{errors.amount.message}</p>
              ) : currentAmount > 0 && !overpayment ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-ink-500">
                  New balance after payment: <strong className="tabular text-ink-700">{formatGHS(balance - currentAmount)}</strong>
                </p>
              ) : null}

              {wouldExceed && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-error-600">
                  <AlertCircle className="h-4 w-4" />
                  This amount exceeds the remaining balance of {formatGHS(balance)}.
                </p>
              )}
            </div>

            <div>
              <label className="label-text">Payment method</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setValue('note', method, { shouldValidate: true })}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      watchedNote === method
                        ? 'bg-primary-600 text-white'
                        : 'bg-paper-200 text-ink-600 hover:bg-paper-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="note" className="label-text">Note (optional)</label>
              <input
                id="note"
                type="text"
                placeholder="e.g. Cash payment, partial deposit"
                className="input-field"
                {...register('note')}
              />
              {errors.note && <p className="field-error">{errors.note.message}</p>}
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
              {submitting ? <><Spinner /> Recording…</> : <>Record payment</>}
            </button>
          </form>

          {whatsappReminderLink && (
            <a
              href={whatsappReminderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-3 w-full"
            >
              <MessageCircle className="h-4 w-4" /> Send balance reminder via WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="card flex items-center gap-3 p-5">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-success-500" />
          <div>
            <h3 className="font-semibold text-ink-900">Fully paid off</h3>
            <p className="text-sm text-ink-500">All {profile.installment_count} payments have been received.</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setConfirmDeleteClient(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-ink-500 transition-colors hover:bg-error-50 hover:text-error-600"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete this client
      </button>
      </div>

      {/* Payment history */}
      <div className="card mt-5 p-5 lg:col-span-3 lg:mt-0">
        <h2 className="mb-4 flex items-center justify-between font-serif text-lg font-semibold text-ink-800">
          Payment history
          <span className="text-sm font-normal text-ink-500">({installments.length})</span>
        </h2>

        {installments.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-7 w-7" />}
            title="No payments yet"
            description="Record the first instalment to start tracking this layaway."
          />
        ) : (
          <ul className="space-y-3">
            {installments.map((inst) => (
              <li
                key={inst.id}
                className="flex items-start gap-3 rounded-xl border border-paper-100 p-3 transition-colors hover:bg-paper-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold tabular text-ink-900">{formatGHS(inst.amount)}</p>
                    <span className="font-mono text-[10px] text-ink-500">{inst.receipt_no}</span>
                  </div>
                  <p className="text-xs text-ink-500">{formatDateTime(inst.payment_date)}</p>
                  {inst.note && <p className="mt-1 text-xs text-ink-600">{inst.note}</p>}
                </div>
                <button
                  onClick={() => {
                    const paid = profile.total_paid;
                    setLastPayment({
                      installment: inst,
                      result: {
                        new_balance: profile.balance,
                        installment_id: inst.id,
                        receipt_no: inst.receipt_no || '',
                        total_paid: paid,
                        total_cost: profile.total_cost,
                      },
                    });
                    setReceiptOpen(true);
                  }}
                  className="shrink-0 rounded-lg p-2 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
                  aria-label="View receipt"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const paid = profile.total_paid;
                    setLastPayment({
                      installment: inst,
                      result: {
                        new_balance: profile.balance,
                        installment_id: inst.id,
                        receipt_no: inst.receipt_no || '',
                        total_paid: paid,
                        total_cost: profile.total_cost,
                      },
                    });
                    setConfirmDelete(true);
                  }}
                  className="shrink-0 rounded-lg p-2 text-ink-500 transition-colors hover:bg-error-50 hover:text-error-600"
                  aria-label="Remove payment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {/* Receipt modal */}
      {lastPayment && (
        <ReceiptModal
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            setLastPayment(null);
          }}
          artisan={artisan}
          layaway={profile}
          installment={lastPayment.installment}
          balanceAfter={lastPayment.result.new_balance}
          totalPaid={lastPayment.result.total_paid}
        />
      )}

      {/* Edit client modal */}
      <EditClientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onUpdated={refetch}
      />

      {/* Delete payment confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Remove this payment?"
        message="This will reverse the payment and recalculate the balance. This cannot be undone."
        confirmLabel="Remove payment"
        onConfirm={handleDeletePayment}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Delete client confirmation */}
      <ConfirmDialog
        open={confirmDeleteClient}
        title="Delete this client?"
        message="This permanently removes the client and all of their payment history. This cannot be undone."
        confirmLabel={deletingClient ? 'Removing…' : 'Delete client'}
        onConfirm={handleDeleteClient}
        onCancel={() => setConfirmDeleteClient(false)}
      />
    </div>
  );
}
