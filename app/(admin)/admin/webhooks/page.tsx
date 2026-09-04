'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { adminGetWebhookHealth } from '@/app/actions/admin-actions';
import {
  CheckCircle,
  XCircle,
  WarningCircle,
  CaretLeft,
  CaretRight,
  ArrowClockwise,
} from '@phosphor-icons/react';

interface WebhookEventItem {
  id: string;
  type: string;
  emailId?: string;
  status: 'ok' | 'failed';
  detail: string;
  createdAt: string;
}

interface Health {
  events: WebhookEventItem[];
  total: number;
  totalPages: number;
  lastOkAt: string | null;
  ok24h: number;
  failed24h: number;
}

// `now` is pinned at fetch time so rendering stays pure.
function relative(iso: string, now: number) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function AdminWebhooksPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchHealth = useCallback((p: number) => {
    startTransition(async () => {
      setIsLoading(true);
      setHealth((await adminGetWebhookHealth(p)) as Health);
      setFetchedAt(Date.now());
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchHealth(page);
  }, [page, fetchHealth]);

  const ok24h = health?.ok24h ?? 0;
  const failed24h = health?.failed24h ?? 0;
  const total24h = ok24h + failed24h;

  // ok24h is already windowed server-side, so zero successes means the endpoint
  // has been silent or erroring for a full day.
  const status: 'healthy' | 'degraded' | 'down' =
    ok24h === 0 ? 'down' : failed24h > ok24h ? 'degraded' : 'healthy';

  const banner = {
    healthy: {
      icon: CheckCircle,
      className: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600',
      title: 'Receiving webhooks',
    },
    degraded: {
      icon: WarningCircle,
      className: 'border-amber-500/30 bg-amber-500/5 text-amber-600',
      title: 'Webhooks are failing',
    },
    down: {
      icon: XCircle,
      className: 'border-rose-500/30 bg-rose-500/5 text-rose-600',
      title: 'No successful webhook in the last 24h',
    },
  }[status];

  const BannerIcon = banner.icon;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Webhook Health</h1>
        <button
          onClick={() => fetchHealth(page)}
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm transition-colors hover:bg-muted"
        >
          <ArrowClockwise size={16} />
          Refresh
        </button>
      </div>

      <div className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${banner.className}`}>
        <BannerIcon size={22} weight="fill" className="shrink-0" />
        <div>
          <p className="text-sm font-semibold">{banner.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {health?.lastOkAt
              ? `Last success ${relative(health.lastOkAt, fetchedAt)}. `
              : 'No successful delivery recorded. '}
            {total24h > 0
              ? `${ok24h} ok / ${failed24h} failed in the last 24h.`
              : 'No events in the last 24h — check the Resend webhook endpoint and secret.'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Status', 'Event', 'Email ID', 'Detail', 'When'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : !health?.events.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No webhook events recorded yet
                  </td>
                </tr>
              ) : (
                health.events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
                          event.status === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {event.status === 'ok' ? (
                          <CheckCircle size={12} weight="fill" />
                        ) : (
                          <XCircle size={12} weight="fill" />
                        )}
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{event.type}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                      {event.emailId || '—'}
                    </td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-sm text-muted-foreground">
                      {event.detail}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground"
                      title={new Date(event.createdAt).toLocaleString()}
                    >
                      {relative(event.createdAt, fetchedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {health?.total ?? 0} events · kept for 30 days
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CaretLeft size={14} />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {health?.totalPages ?? 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(health?.totalPages ?? 1, p + 1))}
              disabled={page >= (health?.totalPages ?? 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
