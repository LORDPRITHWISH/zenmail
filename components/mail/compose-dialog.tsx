'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMailStore, ComposeAttachment, ComposeDraft, EmailItem } from '@/lib/store';
import { useSession } from 'next-auth/react';
import { saveDraft, discardDraft } from '@/app/actions/send-email';
import { getSettings } from '@/app/actions/settings-actions';
import { MAX_ATTACHMENT_SIZE, UNDO_SEND_SECONDS } from '@/lib/constants';
import { RecipientInput } from './recipient-input';
import { RichEditor } from './rich-editor';
import {
  X,
  Minus,
  PaperPlaneTilt,
  Paperclip,
  Trash,
  CaretUp,
  ClockCountdown,
} from '@phosphor-icons/react';
import { useTransition } from 'react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function quoteBlock(from: string, createdAt: string, body: string) {
  return `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
    <p>On ${new Date(createdAt).toLocaleDateString()}, ${from} wrote:</p>
    ${body}
  </div>`;
}

/** The soonest a scheduled send can be set to, formatted for datetime-local. */
function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

interface InitialState {
  draftId?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  showCcBcc: boolean;
  attachments: ComposeAttachment[];
  from: string;
}

/**
 * What the window starts out holding: a saved draft, a reply/forward, or a
 * blank message. Computed once when the window mounts — the store bumps
 * composeKey on every open, so each open is a fresh mount.
 */
function initialState(
  draft: ComposeDraft | null,
  mode: 'new' | 'reply' | 'replyAll' | 'forward',
  replyTo: EmailItem | null,
  from: string | undefined,
  ownEmail: string | null | undefined
): InitialState {
  if (draft) {
    return {
      draftId: draft.id,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject === '(No Subject)' ? '' : draft.subject,
      html: draft.html,
      showCcBcc: draft.cc.length > 0 || draft.bcc.length > 0,
      attachments: draft.attachments,
      from: draft.from || from || '',
    };
  }

  const blank: InitialState = {
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    html: '',
    showCcBcc: false,
    attachments: [],
    from: from || '',
  };

  if (!replyTo || mode === 'new') return blank;

  const originalFrom = replyTo.from.match(/<(.+?)>/)?.[1] || replyTo.from;
  const body = replyTo.html || `<p>${replyTo.text || ''}</p>`;

  if (mode === 'forward') {
    return {
      ...blank,
      subject: `Fwd: ${replyTo.subject.replace(/^Fwd:\s*/i, '')}`,
      html: `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
        <p>---------- Forwarded message ----------</p>
        <p>From: ${replyTo.from}</p>
        <p>Date: ${new Date(replyTo.createdAt).toLocaleDateString()}</p>
        <p>Subject: ${replyTo.subject}</p>
        <p>To: ${replyTo.to.join(', ')}</p>
        <br/>
        ${body}
      </div>`,
    };
  }

  const isReplyAll = mode === 'replyAll';
  return {
    ...blank,
    to: isReplyAll
      ? [originalFrom, ...replyTo.to.filter((e) => e !== ownEmail)]
      : [originalFrom],
    cc: isReplyAll ? replyTo.cc : [],
    showCcBcc: isReplyAll && replyTo.cc.length > 0,
    subject: `Re: ${replyTo.subject.replace(/^Re:\s*/i, '')}`,
    html: quoteBlock(replyTo.from, replyTo.createdAt, body),
  };
}

export function ComposeDialog() {
  const { data: session } = useSession();
  const {
    closeCompose,
    composeMode,
    composeReplyTo,
    composeFrom,
    composeDraft,
    queueSend,
  } = useMailStore();

  const [initial] = useState(() =>
    initialState(composeDraft, composeMode, composeReplyTo, composeFrom, session?.user?.email)
  );

  const [draftId, setDraftId] = useState<string | undefined>(initial.draftId);
  const [to, setTo] = useState<string[]>(initial.to);
  const [cc, setCc] = useState<string[]>(initial.cc);
  const [bcc, setBcc] = useState<string[]>(initial.bcc);
  const [subject, setSubject] = useState(initial.subject);
  const [html, setHtml] = useState(initial.html);
  const [fromAddress, setFromAddress] = useState(initial.from);
  const [showCcBcc, setShowCcBcc] = useState(initial.showCcBcc);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>(initial.attachments);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = useRef(false);

  // A send can't be scheduled for the past; fixed at mount so it stays stable.
  const [earliestSchedule] = useState(() => localInputValue(new Date(Date.now() + 60_000)));

  const isAdmin = (session?.user as Record<string, unknown>)?.role === 'admin';
  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);

  const currentDraft = useCallback(
    () => ({
      id: draftId,
      to,
      cc,
      bcc,
      subject: subject || '(No Subject)',
      html,
      from: isAdmin && fromAddress ? fromAddress : undefined,
      inReplyTo: composeReplyTo?.messageId || undefined,
      threadId: composeReplyTo?.threadId || undefined,
      attachments,
    }),
    [draftId, to, cc, bcc, subject, html, isAdmin, fromAddress, composeReplyTo, attachments]
  );

  // Drop the signature in where the user can see and edit it, the way Gmail
  // does — rather than stapling it on invisibly at send time.
  useEffect(() => {
    if (composeDraft) return;
    let cancelled = false;
    getSettings().then(({ signature }) => {
      if (cancelled || !signature) return;
      setHtml((prev) =>
        prev.includes('data-zenmail-signature')
          ? prev
          : `${prev}<br/><div data-zenmail-signature>${signature}</div>`
      );
    });
    return () => {
      cancelled = true;
    };
  }, [composeDraft]);

  // Autosave, so closing the tab mid-sentence doesn't lose the message.
  useEffect(() => {
    if (!isDirty.current) return;
    if (to.length === 0 && !subject && !html) return;

    const timer = setTimeout(async () => {
      const result = await saveDraft(currentDraft());
      if (result.emailId) {
        setDraftId(result.emailId);
        setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [to, cc, bcc, subject, html, attachments, currentDraft]);

  const markDirty = () => {
    isDirty.current = true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const added: ComposeAttachment[] = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      added.push({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        content: Buffer.from(buffer).toString('base64'),
      });
    }

    const next = [...attachments, ...added];
    const nextSize = next.reduce((sum, a) => sum + a.size, 0);

    if (nextSize > MAX_ATTACHMENT_SIZE) {
      setSendError(
        `Attachments would total ${formatFileSize(nextSize)} — the limit is ${formatFileSize(MAX_ATTACHMENT_SIZE)}.`
      );
    } else {
      setSendError(null);
      setAttachments(next);
      markDirty();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const handleSend = () => {
    if (to.length === 0) {
      setSendError('Add at least one recipient.');
      return;
    }
    if (totalSize > MAX_ATTACHMENT_SIZE) {
      setSendError(`Attachments are over the ${formatFileSize(MAX_ATTACHMENT_SIZE)} limit.`);
      return;
    }

    const draft = currentDraft();

    // A scheduled message has nothing to undo — it goes straight out (to be
    // held by Resend). Everything else waits out the undo window first.
    if (scheduleAt) {
      queueSend({ ...draft, scheduledAt: new Date(scheduleAt).toISOString() }, 0);
    } else {
      queueSend(draft, UNDO_SEND_SECONDS * 1000);
    }

    closeCompose();
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      const result = await saveDraft(currentDraft());
      if (result.error) {
        setSendError(result.error);
        return;
      }
      closeCompose();
    });
  };

  const handleDiscard = () => {
    startTransition(async () => {
      if (draftId) await discardDraft(draftId);
      closeCompose();
    });
  };

  const title =
    composeDraft?.id
      ? 'Edit Draft'
      : composeMode === 'new'
        ? 'New Message'
        : composeMode === 'reply'
          ? 'Reply'
          : composeMode === 'replyAll'
            ? 'Reply All'
            : 'Forward';

  return (
    <div
      className={`fixed bottom-0 right-6 z-50 flex flex-col rounded-t-xl border border-b-0 border-border bg-card shadow-2xl shadow-black/20 transition-all duration-300 ${
        isMinimized ? 'h-12 w-[500px]' : 'h-[600px] w-[560px]'
      }`}
    >
      {/* Header */}
      <div
        className="flex h-12 shrink-0 cursor-pointer items-center justify-between rounded-t-xl bg-foreground/[0.03] px-4"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          {savedAt && !isMinimized && (
            <span className="mr-1 text-xs text-muted-foreground">Saved {savedAt}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isMinimized ? <CaretUp size={14} /> : <Minus size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeCompose();
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Close (the draft is kept)"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Admin: From field */}
          {isAdmin && (
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <label className="shrink-0 text-sm text-muted-foreground">From</label>
              <input
                type="text"
                value={fromAddress}
                onChange={(e) => {
                  setFromAddress(e.target.value);
                  markDirty();
                }}
                placeholder={`support@${process.env.NEXT_PUBLIC_RESEND_DOMAIN || 'yourdomain.com'}`}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          )}

          {/* Recipients */}
          <RecipientInput
            label="To"
            recipients={to}
            onChange={(next) => {
              setTo(next);
              markDirty();
            }}
          />

          {!showCcBcc && (
            <div className="flex justify-end border-b border-border px-4 py-1">
              <button
                onClick={() => setShowCcBcc(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cc/Bcc
              </button>
            </div>
          )}

          {showCcBcc && (
            <>
              <RecipientInput
                label="Cc"
                recipients={cc}
                onChange={(next) => {
                  setCc(next);
                  markDirty();
                }}
              />
              <RecipientInput
                label="Bcc"
                recipients={bcc}
                onChange={(next) => {
                  setBcc(next);
                  markDirty();
                }}
              />
            </>
          )}

          {/* Subject */}
          <div className="border-b border-border px-4 py-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                markDirty();
              }}
              placeholder="Subject"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>

          {/* Rich editor */}
          <div className="flex-1 overflow-y-auto">
            <RichEditor
              content={html}
              onChange={(next) => {
                setHtml(next);
                markDirty();
              }}
              placeholder="Compose your email..."
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs"
                  >
                    <Paperclip size={12} className="text-muted-foreground" />
                    <span className="max-w-[120px] truncate text-foreground">{att.filename}</span>
                    <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatFileSize(totalSize)} of {formatFileSize(MAX_ATTACHMENT_SIZE)}
              </p>
            </div>
          )}

          {/* Schedule picker */}
          {showSchedule && (
            <div className="flex items-center gap-2 border-t border-border px-4 py-2">
              <ClockCountdown size={16} className="shrink-0 text-muted-foreground" />
              <input
                type="datetime-local"
                value={scheduleAt}
                min={earliestSchedule}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
              />
              {scheduleAt && (
                <button
                  onClick={() => setScheduleAt('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Send error */}
          {sendError && (
            <div className="border-t border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
              {sendError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={handleSend}
                disabled={isPending || to.length === 0}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-50"
              >
                <PaperPlaneTilt size={16} weight="fill" />
                {scheduleAt ? 'Schedule' : 'Send'}
              </button>

              <button
                onClick={() => setShowSchedule((v) => !v)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground ${
                  scheduleAt ? 'text-primary' : 'text-muted-foreground'
                }`}
                title="Schedule send"
              >
                <ClockCountdown size={18} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveDraft}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                onClick={handleDiscard}
                disabled={isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Discard"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
