import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getInitials } from '@/lib/format';

export function TopBar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || 'Artisan';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-primary-800/30 bg-primary-700 text-white safe-top">
        <div className="flex items-center justify-between px-4 py-3 md:px-8">
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-3 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-primary-600"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/40 text-sm font-bold ring-1 ring-white/20">
                {getInitials(displayName)}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
                <p className="text-xs text-primary-200">LedgerPay</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-primary-200 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-paper-200 bg-white py-1.5 text-ink-800 shadow-elevated animate-scale-in"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-paper-100"
                >
                  <Settings className="h-4 w-4 text-ink-500" /> Edit profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-error-600 transition-colors hover:bg-error-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        message="You will need to sign in again to access your layaway records."
        confirmLabel="Sign out"
        onConfirm={async () => {
          setConfirmOpen(false);
          await signOut();
          navigate('/login', { replace: true });
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

