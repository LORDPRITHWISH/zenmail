'use client';

import { useEffect, useState } from 'react';
import { adminGetStats } from '@/app/actions/admin-actions';
import {
  EnvelopeSimple,
  Users,
  PaperPlaneTilt,
  Tray,
  EnvelopeOpen,
} from '@phosphor-icons/react';

interface Stats {
  totalEmails: number;
  totalUsers: number;
  totalSent: number;
  totalReceived: number;
  totalUnread: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminGetStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

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
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Sent',
      value: stats?.totalSent || 0,
      icon: PaperPlaneTilt,
      color: 'bg-violet-500/10 text-violet-600',
    },
    {
      label: 'Received',
      value: stats?.totalReceived || 0,
      icon: Tray,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'Unread',
      value: stats?.totalUnread || 0,
      icon: EnvelopeOpen,
      color: 'bg-rose-500/10 text-rose-600',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}
                >
                  <Icon size={22} weight="duotone" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">
                {card.value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
