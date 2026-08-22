'use client';

import { useEffect, useState } from 'react';
import { useMailStore } from '@/lib/store';
import { sendEmail } from '@/app/actions/send-email';
import { getUnreadCounts } from '@/app/actions/email-actions';
import { ArrowCounterClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';

type Status = { kind: 'sent' | 'scheduled' | 'error'; message: string };

/**
 * Holds a queued send for its undo window, then actually sends it.
 *
 * The delay lives here rather than on the server so that "Undo" is a plain
 * cancelled timer — no message is created anywhere until the window closes.
 * ponytail: a full page reload during the window drops the send; the draft is
 * still autosaved, and a server-side hold would need a scheduler to beat it.
 */
export function SendToast() {
  const { pendingSend, clearPendingSend, openDraft, setUnreadCounts } = useMailStore();
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<Status | null>(null);

  // Derived, not stored — one clock drives the label.
  const remaining = pendingSend ? Math.max(0, Math.ceil((pendingSend.sendAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!pendingSend) return;

    const draft = pendingSend.draft;
    const hold = Math.max(0, pendingSend.sendAt - Date.now());

    const tick = setInterval(() => setNow(Date.now()), 250);

    const timer = setTimeout(async () => {
      clearPendingSend();
      const result = await sendEmail({
        id: draft.id,
        from: draft.from,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        html: draft.html,
        inReplyTo: draft.inReplyTo,
        threadId: draft.threadId,
        scheduledAt: draft.scheduledAt,
        attachments: draft.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
          size: a.size,
        })),
      });

      if (result.error) {
        setStatus({ kind: 'error', message: result.error });
      } else if (result.scheduledAt) {
        setStatus({
          kind: 'scheduled',
          message: `Scheduled for ${new Date(result.scheduledAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
        });
      } else {
        setStatus({ kind: 'sent', message: 'Message sent' });
      }

      const counts = await getUnreadCounts();
      if (counts.counts) setUnreadCounts(counts.counts);
    }, hold);

    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [pendingSend, clearPendingSend, setUnreadCounts]);

  // Clear the outcome banner on its own, so it doesn't sit there forever.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), status.kind === 'error' ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleUndo = () => {
    if (!pendingSend) return;
    const draft = pendingSend.draft;
    clearPendingSend();
    openDraft(draft);
  };

  if (pendingSend) {
    return (
      <div className="fixed bottom-6 left-6 z-[60] flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
        <span className="text-foreground">
          Sending{remaining > 0 ? ` in ${remaining}s` : '...'}
        </span>
        <button
          onClick={handleUndo}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          Undo
        </button>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-[60] flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
        status.kind === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-border bg-card text-foreground'
      }`}
    >
      {status.kind === 'error' ? (
        <WarningCircle size={16} weight="fill" />
      ) : (
        <CheckCircle size={16} weight="fill" className="text-emerald-500" />
      )}
      {status.message}
    </div>
  );
}
