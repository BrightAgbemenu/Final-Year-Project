import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 safe-top">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            exiting={exiting.has(toast.id)}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  exiting,
  onDismiss,
}: {
  toast: Toast;
  exiting: boolean;
  onDismiss: () => void;
}) {
  const config = {
    success: { icon: CheckCircle2, bg: 'bg-success-600', ring: 'ring-success-200' },
    error: { icon: AlertCircle, bg: 'bg-error-600', ring: 'ring-error-200' },
    info: { icon: Info, bg: 'bg-ink-700', ring: 'ring-ink-200' },
  };
  const { icon: Icon, bg } = config[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl ${bg} px-4 py-3 text-white shadow-elevated transition-all duration-200 ${
        exiting ? '-translate-y-2 opacity-0' : 'animate-slide-down opacity-100'
      }`}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-0.5 transition-colors hover:bg-white/20"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
