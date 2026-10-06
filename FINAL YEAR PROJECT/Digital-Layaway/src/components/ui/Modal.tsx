import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-lg' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-paper-50 shadow-elevated animate-slide-up sm:rounded-3xl scrollbar-hide`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 flex items-center justify-between border-b border-paper-200 bg-paper-50/95 px-5 py-4 backdrop-blur">
            <h2 className="font-serif text-lg font-semibold text-ink-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
