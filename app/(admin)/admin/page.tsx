'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetStats, adminGetEmailTrend } from '@/app/actions/admin-actions';
import type { TrendPoint } from '@/lib/trend';
import {
  EnvelopeSimple,
  Users,
  PaperPlaneTilt,
  Tray,
  EnvelopeOpen,
  ArrowRight,
} from '@phosphor-icons/react';

interface Stats {
  totalEmails: number;
  totalUsers: number;
  totalSent: number;
  totalReceived: number;
  totalUnread: number;
}

const SERIES = [
  { key: 'received', label: 'Received', color: 'var(--color-amber-500)' },
  { key: 'sent', label: 'Sent', color: 'var(--color-violet-500)' },
] as const;

function TrendChart({ data }: { data: TrendPoint[] }) {
  const W = 720;
  const H = 180;
  const PAD = 6;

  const max = Math.max(1, ...data.flatMap((d) => [d.received, d.sent]));
  const x = (i: number) => (data.length < 2 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const points = (key: 'received' | 'sent') =>
    data.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');

  const fmt = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-44 w-full overflow-visible"
          role="img"
          aria-label={`Email volume over the last ${data.length} days`}
        >
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={0}
              x2={W}
              y1={PAD + t * (H - PAD * 2)}
              y2={PAD + t * (H - PAD * 2)}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {SERIES.map((s) => (
            <polyline
              key={s.key}
              points={points(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <span className="pointer-events-none absolute left-0 top-0 text-[10px] text-muted-foreground">
          {max.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{data.length > 0 && fmt(data[0].day)}</span>
        <span>{data.length > 0 && fmt(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [days, setDays] = useState<7 | 30>(30);

  useEffect(() => {
    adminGetStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    let stale = false;
    adminGetEmailTrend(days).then((d) => {
      if (!stale) setTrend(d);
    });
    return () => {
      stale = true;
    };
  }, [days]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Emails',
      value: stats?.totalEmails || 0,
      icon: EnvelopeSimple,
      color: 'bg-blue-500/10 text-blue-600',
      href: '/admin/emails',
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600',
      href: '/admin/users',
    },
    {
      label: 'Sent',
      value: stats?.totalSent || 0,
      icon: PaperPlaneTilt,
      color: 'bg-violet-500/10 text-violet-600',
      href: '/admin/emails?folder=sent',
    },
    {
      label: 'Received',
      value: stats?.totalReceived || 0,
      icon: Tray,
      color: 'bg-amber-500/10 text-amber-600',
      href: '/admin/emails?folder=inbox',
    },
    {
      label: 'Unread',
      value: stats?.totalUnread || 0,
      icon: EnvelopeOpen,
      color: 'bg-rose-500/10 text-rose-600',
      href: '/admin/emails?unread=1',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}
                >
                  <Icon size={22} weight="duotone" />
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {card.value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Volume trend */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email volume</h2>
            <div className="mt-1.5 flex items-center gap-4">
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-0.5 w-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                  {trend && (
                    <span className="font-medium text-foreground">
                      {trend.reduce((sum, d) => sum + d[s.key], 0).toLocaleString()}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  days === d
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {trend ? (
          <TrendChart data={trend} />
        ) : (
          <div className="flex h-44 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
