'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useMailStore } from '@/lib/store';
import {
  ChartBar,
  EnvelopeSimple,
  Users,
  ArrowLeft,
  ShieldCheck,
  ClockCounterClockwise,
  Globe,
  Broadcast,
  PencilSimple,
} from '@phosphor-icons/react';

const NAV_ITEMS = [
  { id: '/admin', label: 'Dashboard', icon: ChartBar },
  { id: '/admin/emails', label: 'All Emails', icon: EnvelopeSimple },
  { id: '/admin/inboxes', label: 'Inboxes', icon: EnvelopeSimple },
  { id: '/admin/users', label: 'Users', icon: Users },
  { id: '/admin/domains', label: 'Domain', icon: Globe },
  { id: '/admin/webhooks', label: 'Webhooks', icon: Broadcast },
  { id: '/admin/logs', label: 'Audit Log', icon: ClockCounterClockwise },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const openCompose = useMailStore((s) => s.openCompose);

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-svh w-60 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <ShieldCheck size={22} weight="fill" className="text-amber-500" />
        <span className="text-sm font-bold text-sidebar-foreground">
          Admin Panel
        </span>
      </div>

      {/* Compose */}
      <div className="p-3">
        <button
          onClick={() => openCompose()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97]"
        >
          <PencilSimple size={18} weight="bold" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-primary' : ''}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Back to mail */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => router.push('/inbox')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ArrowLeft size={20} />
          <span>Back to Mail</span>
        </button>
      </div>
    </aside>
  );
}
