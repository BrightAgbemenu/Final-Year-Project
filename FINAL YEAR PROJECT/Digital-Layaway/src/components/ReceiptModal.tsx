import { Modal } from '@/components/ui/Modal';
import { Download, Check, MessageCircle, Printer } from 'lucide-react';
import { useState } from 'react';
import { formatGHS, formatDateTime, getDisplayName } from '@/lib/format';
import type { Profile, LayawayProfile, Installment } from '@/types/database';
import { generateReceiptPDF, getReceiptPDFFile } from '@/lib/receipt-pdf';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useToast } from '@/components/ui/Toast';

type ReceiptModalProps = {
  open: boolean;
  onClose: () => void;
  artisan: Profile | null;
  layaway: LayawayProfile;
  installment: Installment;
  balanceAfter: number;
  totalPaid: number;
};

export function ReceiptModal({
  open,
  onClose,
  artisan,
  layaway,
  installment,
  balanceAfter,
  totalPaid,
}: ReceiptModalProps) {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const receiptData = { artisan, layaway, installment, balanceAfter, totalPaid };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateReceiptPDF(receiptData);
    } finally {
      setDownloading(false);
    }
  };

  const whatsappMessage = `Hi ${layaway.client_name}, here's your receipt for ${formatGHS(
    installment.amount
  )} paid towards ${layaway.item_description} on ${formatDateTime(installment.payment_date)}. Receipt No: ${
    installment.receipt_no || '—'
  }. Outstanding balance: ${formatGHS(balanceAfter)}. — ${getDisplayName(artisan)}, via LedgerPay`;
  const whatsappTextLink = buildWhatsAppLink(layaway.client_phone, whatsappMessage);

  const handleShare = async () => {
    setSharing(true);
    try {
      const file = await getReceiptPDFFile(receiptData);
      const shareData = { files: [file], title: 'Payment Receipt', text: whatsappMessage };

      if (navigator.canShare && navigator.canShare(shareData)) {
        // Opens the device's native share sheet with the actual PDF attached —
        // the artisan picks WhatsApp (or any app) from there.
        await navigator.share(shareData);
        return;
      }

      // Fallback for browsers that can't share files: download the PDF, then
      // open WhatsApp with a pre-filled message so the artisan can attach it manually.
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      if (whatsappTextLink) {
        window.open(whatsappTextLink, '_blank', 'noopener,noreferrer');
        showToast('Receipt downloaded — attach it to the WhatsApp chat that just opened.', 'info');
      } else {
        showToast('Receipt downloaded. Add a client phone number to also open WhatsApp.', 'info');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        showToast('Could not share the receipt. Please try downloading it instead.', 'error');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Payment Receipt" size="md">
      <div className="space-y-4">
        {/* Receipt header */}
        <div className="rounded-2xl bg-primary-700 px-4 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg font-bold">{artisan?.business_name || 'LedgerPay'}</p>
              <p className="text-xs text-primary-200">
                {artisan?.business_name ? 'Payment Receipt · via LedgerPay' : 'Payment Receipt'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-200">Receipt No.</p>
              <p className="font-mono text-sm font-semibold">{installment.receipt_no}</p>
            </div>
          </div>
        </div>

        {/* Artisan + client info */}
        <div className="space-y-2 text-sm">
          <Row label="Artisan" value={artisan?.business_name || artisan?.full_name || '—'} />
          <Row label="Client" value={layaway.client_name} />
          <Row label="Item" value={layaway.item_description} />
          <Row label="Date" value={formatDateTime(installment.payment_date)} />
        </div>

        {/* Amounts */}
        <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Amount Paid</p>
              <p className="mt-1 font-serif text-2xl font-bold tabular text-primary-700">
                {formatGHS(installment.amount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Outstanding</p>
              <p
                className={`mt-1 font-serif text-2xl font-bold tabular ${
                  balanceAfter <= 0 ? 'text-success-600' : 'text-accent-700'
                }`}
              >
                {formatGHS(balanceAfter)}
              </p>
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex justify-between text-xs text-ink-500">
          <span>Total paid to date: <strong className="text-ink-700 tabular">{formatGHS(totalPaid)}</strong></span>
          <span>Total cost: <strong className="text-ink-700 tabular">{formatGHS(layaway.total_cost)}</strong></span>
        </div>

        {installment.note && (
          <div className="rounded-lg bg-paper-100 px-3 py-2 text-sm text-ink-600">
            <span className="font-semibold">Note: </span>{installment.note}
          </div>
        )}

        {/* Complete badge */}
        {balanceAfter <= 0 && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 py-3 text-success-700">
            <Check className="h-5 w-5" />
            <span className="text-sm font-semibold">This layaway is fully paid off</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary flex-1">
            <Download className="h-4 w-4" /> {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        <button onClick={handleShare} disabled={sharing} className="btn-secondary w-full">
          <MessageCircle className="h-4 w-4" /> {sharing ? 'Preparing receipt…' : 'Share via WhatsApp'}
        </button>

        <p className="flex items-center justify-center gap-1 text-center text-xs text-ink-500">
          <Printer className="h-3 w-3" />
          The digital record at LedgerPay is the authoritative source.
        </p>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}
