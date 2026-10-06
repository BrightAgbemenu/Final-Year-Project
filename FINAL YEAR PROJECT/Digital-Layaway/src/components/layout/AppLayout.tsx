import { Outlet } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import { TopBar } from './TopBar';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';
import { LedgerPreview } from '@/components/auth/AuthShowcase';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-paper-100 md:flex">
      <Sidebar />
      <div className="relative z-0 flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute -left-12 -top-12 -z-10 h-72 w-72 rounded-full bg-primary-300/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-12 -z-10 h-96 w-96 rounded-full bg-accent-300/20 blur-2xl" />
        <TopBar />
        <main className="mx-auto w-full flex-1 px-4 pb-24 pt-4 md:max-w-5xl md:px-8 md:pb-10 md:pt-6">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper-100 md:flex-row">
      {/* Brand panel, shown only where there is room for it. On a phone the form is the
          whole job, so it gets the whole screen. */}
      <aside className="relative z-0 hidden flex-col overflow-hidden bg-primary-900 px-10 py-10 text-white md:flex md:w-[44%] md:shrink-0 lg:px-12 lg:py-12 xl:w-1/2">
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full bg-primary-500/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-80 w-80 rounded-full bg-accent-400/15 blur-2xl" />

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 lg:h-11 lg:w-11">
            <ReceiptText className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
          <p className="font-serif text-xl font-semibold lg:text-2xl">LedgerPay</p>
        </div>

        {/* Flexes into the space between logo and footer, so the three blocks share the
            panel instead of overlapping at any height. */}
        <div className="flex flex-1 flex-col justify-center py-8">
          <h2 className="max-w-md font-serif text-3xl font-bold leading-tight lg:text-4xl">
            Replace the paper notebook.
          </h2>
          <p className="mt-3 max-w-md text-sm text-primary-100 lg:mt-4 lg:text-base">
            Track every instalment, see the balance update instantly, and hand your client
            a receipt they can keep.
          </p>
          <div className="mt-8">
            <LedgerPreview />
          </div>
        </div>

        <p className="shrink-0 text-xs text-primary-200">LedgerPay for artisans</p>
      </aside>

      {/* Form column. Sized and centred so it reads as a finished screen on its own,
          with or without the brand panel beside it. */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 safe-top md:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">
          {/* Carries the brand where the panel is hidden. */}
          <div className="mb-6 flex items-center justify-center gap-2.5 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-soft">
              <ReceiptText className="h-5 w-5" />
            </div>
            <p className="font-serif text-lg font-semibold text-ink-900">LedgerPay</p>
          </div>

          <div className="card p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
