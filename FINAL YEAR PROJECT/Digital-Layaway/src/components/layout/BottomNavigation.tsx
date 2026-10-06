import { NavLink, useLocation } from 'react-router-dom';
import { Home, Plus, ReceiptText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/clients/new', label: 'New', icon: Plus },
  { to: '/history', label: 'Receipts', icon: ReceiptText },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-200 bg-paper-50/95 backdrop-blur safe-bottom md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/' || /^\/clients\/(?!new$)[^/]+$/.test(location.pathname)
              : location.pathname.startsWith(item.to);

          const isCenter = item.to === '/clients/new';

          if (isCenter) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative -mt-6 flex flex-col items-center"
                aria-label={item.label}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-ink-950 shadow-fab transition-transform active:scale-95">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <span className="mt-1 text-[10px] font-semibold text-ink-600">{item.label}</span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors"
              aria-label={item.label}
            >
              <Icon
                className={`h-6 w-6 transition-colors ${
                  isActive ? 'text-primary-600' : 'text-ink-400'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-primary-600' : 'text-ink-500'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
