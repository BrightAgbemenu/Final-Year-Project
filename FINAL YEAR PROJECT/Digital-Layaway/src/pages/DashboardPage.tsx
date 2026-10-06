import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Search, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { useLayawayProfiles } from '@/hooks/useLayaway';
import { useAuth } from '@/context/AuthContext';
import { mapFetchError } from '@/lib/errors';
import { formatGHS, formatDate, getAvatarColor, getInitials } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Spinner';

type StatusFilter = 'all' | 'active' | 'paid';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paid', label: 'Paid off' },
];

export function DashboardPage() {
  const { profiles, loading, error, refetch } = useLayawayProfiles();
  const { profile: artisan } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const firstName = (artisan?.full_name || 'there').split(' ')[0];
  const totalOutstanding = profiles.reduce((sum, p) => sum + Math.max(p.balance, 0), 0);
  const totalCollected = profiles.reduce((sum, p) => sum + p.total_paid, 0);
  const activeClients = profiles.filter((p) => p.balance > 0).length;

  const monthlyCollections = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
        total: 0,
      });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    profiles.forEach((p) => {
      p.payments.forEach((payment) => {
        const d = new Date(payment.payment_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = bucketMap.get(key);
        if (bucket) bucket.total += payment.amount;
      });
    });
    const max = Math.max(...buckets.map((b) => b.total), 1);
    return buckets.map((b) => ({
      ...b,
      pct: b.total > 0 ? Math.max((b.total / max) * 100, 8) : 3,
    }));
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesQuery =
        !q ||
        p.client_name.toLowerCase().includes(q) ||
        p.item_description.toLowerCase().includes(q);
      const isComplete = p.balance <= 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isComplete) ||
        (statusFilter === 'paid' && isComplete);
      return matchesQuery && matchesStatus;
    });
  }, [profiles, query, statusFilter]);

  const isFiltering = query.trim() !== '' || statusFilter !== 'all';
  const recentClients = profiles.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="animate-fade-in">
        <p className="text-sm text-ink-500">Hello, {firstName}</p>
        <h1 className="font-serif text-2xl font-bold text-ink-900">Your layaway records</h1>
      </div>

      {!loading && !error && profiles.length > 0 && (
        <>
          {/* Hero + secondary summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="card overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white sm:col-span-3">
              <div className="flex items-center gap-2 text-primary-100">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Outstanding</span>
              </div>
              <p className="mt-3 font-serif text-3xl font-bold tabular">{formatGHS(totalOutstanding)}</p>
              <p className="mt-1 text-xs text-primary-200">across {activeClients} active clients</p>

              <div className="mt-5 flex h-12 items-end gap-1.5">
                {monthlyCollections.map((m) => (
                  <div
                    key={m.key}
                    className="flex-1 rounded-t bg-white/30 transition-all duration-500"
                    style={{ height: `${m.pct}%` }}
                    title={`${m.label}: ${formatGHS(m.total)}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-medium text-primary-200">
                {monthlyCollections.map((m) => (
                  <span key={m.key} className="flex-1 text-center">
                    {m.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="card flex flex-col justify-between p-5 sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Collected</span>
              </div>
              <p className="mt-3 font-serif text-2xl font-bold tabular text-primary-700">
                {formatGHS(totalCollected)}
              </p>
              <p className="mt-1 text-xs text-ink-500">last 6 months' trend shown alongside</p>
            </div>
          </div>

          {/* Recent clients */}
          {recentClients.length > 0 && (
            <div className="card flex items-center gap-3 p-4">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-500">Recent</p>
              <div className="flex -space-x-2">
                {recentClients.map((p) => {
                  const colors = getAvatarColor(p.client_name);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/clients/${p.id}`)}
                      title={p.client_name}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white transition-transform hover:z-10 hover:scale-110 ${colors.bg} ${colors.text}`}
                    >
                      {getInitials(p.client_name)}
                    </button>
                  );
                })}
                {profiles.length > recentClients.length && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-200 text-xs font-bold text-ink-600 ring-2 ring-white">
                    +{profiles.length - recentClients.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Client list header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink-800">
          Clients
          <span className="ml-2 text-sm font-normal text-ink-500">({activeClients} active)</span>
        </h2>
        <button
          onClick={() => navigate('/clients/new')}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Search + filters */}
      {!loading && !error && profiles.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients or items…"
              className="input-field py-2.5 pl-10 pr-9 text-sm"
              aria-label="Search clients"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition-colors hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === f.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-paper-200 text-ink-600 hover:bg-paper-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Client cards */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="Couldn't load your clients"
            description={mapFetchError({ message: error })}
            action={
              <button onClick={() => refetch()} className="btn-primary">
                Try again
              </button>
            }
          />
        </div>
      ) : profiles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No clients yet"
            description="Add your first layaway client to start tracking instalments and generating receipts."
            action={
              <button onClick={() => navigate('/clients/new')} className="btn-accent">
                <Plus className="h-4 w-4" /> Add your first client
              </button>
            }
          />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No matching clients"
            description="Try a different search term or filter."
            action={
              isFiltering ? (
                <button
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                  }}
                  className="btn-secondary"
                >
                  Clear search & filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((p) => {
            const percent = p.total_cost > 0 ? Math.min((p.total_paid / p.total_cost) * 100, 100) : 0;
            const isComplete = p.balance <= 0;
            const colors = getAvatarColor(p.client_name);

            return (
              <button
                key={p.id}
                onClick={() => navigate(`/clients/${p.id}`)}
                className="card w-full overflow-hidden p-0 text-left transition-all duration-200 hover:shadow-elevated active:scale-[0.99] animate-fade-in"
              >
                <div className="flex items-start gap-3 p-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}
                  >
                    {getInitials(p.client_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold text-ink-900">{p.client_name}</h3>
                      {isComplete && (
                        <span className="shrink-0 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-700">
                          Paid off
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-500">{p.item_description}</p>
                  </div>
                </div>

                <div className="border-t border-paper-100 px-4 py-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-ink-500">Outstanding</p>
                      <p
                        className={`font-serif text-lg font-bold tabular ${
                          isComplete ? 'text-success-600' : 'text-ink-900'
                        }`}
                      >
                        {formatGHS(p.balance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-500">Total</p>
                      <p className="text-sm font-semibold text-ink-600 tabular">
                        {formatGHS(p.total_cost)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-success-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-500">
                    {percent.toFixed(0)}% paid · {p.installment_count}{' '}
                    {p.installment_count === 1 ? 'payment' : 'payments'} · Added {formatDate(p.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
