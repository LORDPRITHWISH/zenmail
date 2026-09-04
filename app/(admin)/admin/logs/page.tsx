'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { adminGetLogs } from '@/app/actions/admin-actions';
import {
  Trash,
  EnvelopeSimple,
  CaretLeft,
  CaretRight,
  ShieldCheck,
  Eye,
  Question,
} from '@phosphor-icons/react';

type LogAction = 'delete_email' | 'purge_inbox' | 'set_role' | 'toggle_monitor';

interface LogItem {
  id: string;
  action: LogAction;
  target: string;
  meta: string;
  performedByEmail: string;
  performedByName?: string;
  createdAt: string;
}

const ACTION_META: Record<
  LogAction,
  { label: string; icon: typeof Trash; className: string }
> = {
  delete_email: {
    label: 'Delete Email',
    icon: EnvelopeSimple,
    className: 'bg-amber-500/10 text-amber-600',
  },
  purge_inbox: { label: 'Purge Inbox', icon: Trash, className: 'bg-rose-500/10 text-rose-600' },
  set_role: {
    label: 'Role Change',
    icon: ShieldCheck,
    className: 'bg-violet-500/10 text-violet-600',
  },
  toggle_monitor: { label: 'Monitor', icon: Eye, className: 'bg-blue-500/10 text-blue-600' },
};

const UNKNOWN_ACTION = {
  label: 'Unknown',
  icon: Question,
  className: 'bg-muted text-muted-foreground',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchLogs = useCallback((p: number) => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await adminGetLogs(p);
      setLogs(result.logs as LogItem[]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Audit Log</h1>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No admin actions logged yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = ACTION_META[log.action] ?? UNKNOWN_ACTION;
                  const Icon = meta.icon;
                  return (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${meta.className}`}
                      >
                        <Icon size={12} weight="fill" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-sm font-medium text-foreground">
                      {log.target}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-sm text-muted-foreground">
                      {log.meta}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {log.performedByName || log.performedByEmail}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">{total} total entries</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CaretLeft size={14} />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
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
