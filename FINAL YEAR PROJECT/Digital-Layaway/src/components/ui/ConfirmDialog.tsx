import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-paper-50 p-6 shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              variant === 'danger' ? 'bg-error-100 text-error-600' : 'bg-primary-100 text-primary-600'
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
        <h2 className="text-center font-serif text-lg font-semibold text-ink-900">{title}</h2>
        <p className="mt-2 text-center text-sm text-ink-600">{message}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmRenderProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmProvider(props: ConfirmRenderProps) {
  return <ConfirmDialog {...props} />;
}
