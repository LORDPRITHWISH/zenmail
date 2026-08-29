'use client';

import { useEffect, useState, useTransition } from 'react';
import { adminGetInboxes, adminToggleMonitorInbox, adminPurgeInbox } from '@/app/actions/admin-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tray, Plus, Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface InboxItem {
  email: string;
  count: number;
  unreadCount: number;
  lastEmail: string;
  isMonitored?: boolean;
}

export default function AdminInboxesPage() {
  const [inboxes, setInboxes] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInboxEmail, setNewInboxEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [purgeTarget, setPurgeTarget] = useState<InboxItem | null>(null);
  const router = useRouter();

  const handleCreateInbox = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = process.env.NEXT_PUBLIC_RESEND_DOMAIN || 'yourdomain.com';
    let finalEmail = newInboxEmail.trim();

    if (finalEmail && !finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@${domain}`;
    }

    if (finalEmail && finalEmail.endsWith(`@${domain}`)) {
      router.push(`/admin/inboxes/${encodeURIComponent(finalEmail)}`);
      setIsModalOpen(false);
      setNewInboxEmail('');
      setEmailError('');
    } else {
      setEmailError(`Only @${domain} email addresses are supported.`);
    }
  };

  const fetchInboxes = () => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await adminGetInboxes();
      setInboxes(result as InboxItem[]);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchInboxes();
  }, []);

  const handleToggleMonitor = async (email: string) => {
    startTransition(async () => {
      const result = await adminToggleMonitorInbox(email);
      if (result.success) {
        setInboxes(inboxes.map(i => i.email === email ? { ...i, isMonitored: result.isMonitored } : i));
      }
    });
  };

  const handlePurge = () => {
    if (!purgeTarget) return;
    const email = purgeTarget.email;
    startTransition(async () => {
      await adminPurgeInbox(email);
      setPurgeTarget(null);
      setInboxes((prev) => prev.filter((i) => i.email !== email));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inboxes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 hover:shadow-md"
        >
          <Plus size={18} weight="bold" />
          New Inbox
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-foreground">Create New Inbox</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter a username or full email address.
            </p>
            <form onSubmit={handleCreateInbox}>
              <div className="mb-6">
                <input
                  type="text"
                  autoFocus
                  value={newInboxEmail}
                  onChange={(e) => {
                    setNewInboxEmail(e.target.value);
                    setEmailError('');
                  }}
                  placeholder={`e.g., support or support@${process.env.NEXT_PUBLIC_RESEND_DOMAIN || 'yourdomain.com'}`}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {emailError && <p className="mt-2 text-xs text-destructive">{emailError}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewInboxEmail('');
                    setEmailError('');
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Email Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Total Emails
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Unread
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Last Received
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Action
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
              ) : inboxes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No inboxes found
                  </td>
                </tr>
              ) : (
                inboxes.map((inbox) => (
                  <tr
                    key={inbox.email}
                    onClick={() => router.push(`/admin/inboxes/${encodeURIComponent(inbox.email)}`)}
                    className="group border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Tray size={16} className="text-muted-foreground" />
                        {inbox.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {inbox.count}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inbox.unreadCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {inbox.unreadCount} unread
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(inbox.lastEmail).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMonitor(inbox.email);
                          }}
                          disabled={isPending}
                          className={`inline-flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                            inbox.isMonitored
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                          title={inbox.isMonitored ? "Stop monitoring in base inbox" : "Monitor in base inbox"}
                        >
                          {inbox.isMonitored ? 'Monitored' : 'Monitor'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPurgeTarget(inbox);
                          }}
                          disabled={isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title="Purge inbox"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!purgeTarget}
        title={`Purge ${purgeTarget?.email}?`}
        description={`This permanently deletes all ${purgeTarget?.count ?? 0} email(s) in this inbox. This cannot be undone.`}
        confirmLabel="Purge"
        destructive
        onConfirm={handlePurge}
        onCancel={() => setPurgeTarget(null)}
      />
    </div>
  );
}
