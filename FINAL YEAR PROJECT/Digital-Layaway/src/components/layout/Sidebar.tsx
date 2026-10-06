import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Home, Plus, ReceiptText, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/clients/new', label: 'New client', icon: Plus },
  { to: '/history', label: 'Receipts', icon: ReceiptText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const STORAGE_KEY = 'ledgerpay:sidebar-collapsed';

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1'
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-paper-200 bg-paper-50 transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[76px]' : 'w-60'
      }`}
    >
      <div className={`flex items-center gap-2.5 px-5 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-soft">
          <ReceiptText className="h-5 w-5" />
        </div>
        {!collapsed && <p className="font-serif text-lg font-semibold text-ink-900">LedgerPay</p>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/' || /^\/clients\/(?!new$)[^/]+$/.test(location.pathname)
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition-all ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-primary-600 text-white shadow-soft'
                  : 'text-ink-600 hover:bg-paper-200'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="m-3 flex items-center justify-center gap-2 rounded-xl border border-paper-200 py-2 text-xs font-semibold text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-800"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}
