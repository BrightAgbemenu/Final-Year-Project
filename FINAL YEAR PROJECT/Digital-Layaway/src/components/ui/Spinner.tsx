export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper-100">
      <Spinner className="h-8 w-8 text-primary-600" />
      <p className="text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-shimmer overflow-hidden">
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-paper-200" />
        <div className="h-3 w-1/2 rounded bg-paper-200" />
        <div className="h-8 w-1/3 rounded bg-paper-200" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-32 animate-shimmer rounded bg-paper-200" />

      <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-5">
        <div className="space-y-5 lg:col-span-2">
          <div className="card animate-shimmer overflow-hidden p-0">
            <div className="h-24 bg-paper-200" />
            <div className="space-y-3 px-5 py-4">
              <div className="h-16 rounded-2xl bg-paper-200" />
            </div>
          </div>
          <div className="card animate-shimmer space-y-3 p-5">
            <div className="h-4 w-1/3 rounded bg-paper-200" />
            <div className="h-11 rounded-xl bg-paper-200" />
            <div className="h-11 rounded-xl bg-paper-200" />
          </div>
        </div>

        <div className="card mt-5 animate-shimmer space-y-3 p-5 lg:col-span-3 lg:mt-0">
          <div className="h-4 w-1/3 rounded bg-paper-200" />
          <div className="h-14 rounded-xl bg-paper-200" />
          <div className="h-14 rounded-xl bg-paper-200" />
          <div className="h-14 rounded-xl bg-paper-200" />
        </div>
      </div>
    </div>
  );
}
