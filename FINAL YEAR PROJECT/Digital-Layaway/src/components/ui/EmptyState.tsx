import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-200 text-ink-400">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="font-serif text-lg font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
