import { Check } from 'lucide-react';

/**
 * A non-interactive preview of a real layaway record, built from the same design
 * language as the live app. It replaces a decorative photo on the auth screens:
 * an artisan can see the balance, the progress and the receipt before signing up.
 */
export function LedgerPreview() {
  return (
    <div className="relative w-full max-w-[340px]">
      <div className="rounded-2xl bg-white p-5 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            AM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-900">Ama Mensah</p>
            <p className="truncate text-xs text-ink-500">Kente gown · 3 payments</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-paper-200 bg-paper-50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Outstanding balance
          </p>
          <p className="mt-0.5 font-serif text-2xl font-bold tabular text-ink-900">GHS 450.00</p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-paper-200">
            <div className="h-full w-[62%] rounded-full bg-primary-500" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-500">
            <span className="tabular">GHS 750.00 paid</span>
            <span className="tabular">GHS 1,200.00 total</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/95 p-3.5 shadow-elevated backdrop-blur">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Payment recorded</p>
          <p className="truncate font-mono text-[11px] text-ink-500">LAY-20260922-0412</p>
        </div>
        <p className="shrink-0 font-semibold tabular text-primary-700">GHS 150.00</p>
      </div>
    </div>
  );
}
