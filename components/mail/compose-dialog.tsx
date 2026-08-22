'use client';

import { useState, useRef, useCallback } from 'react';
import { useMailStore } from '@/lib/store';
import { useSession } from 'next-auth/react';
import { sendEmail, saveDraft } from '@/app/actions/send-email';
import { RecipientInput } from './recipient-input';
import { RichEditor } from './rich-editor';
import {
  X,
  Minus,
  PaperPlaneTilt,
  Paperclip,
  Trash,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { useTransition } from 'react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface AttachmentFile {
  file: File;
  base64: string;
}

export function ComposeDialog() {
  const { data: session } = useSession();
  const {
    isComposeOpen,
    closeCompose,
    composeMode,
    composeReplyTo,
    composeFrom,
  } = useMailStore();

  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [fromAddress, setFromAddress] = useState(composeFrom || '');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = (session?.user as Record<string, unknown>)?.role === 'admin';

  // Initialize compose state based on mode
  const initializeCompose = useCallback(() => {
    if (composeReplyTo && composeMode !== 'new') {
      const replyEmail = composeReplyTo;

      if (composeMode === 'reply') {
        setTo([replyEmail.from.match(/<(.+?)>/)?.[1] || replyEmail.from]);
        setSubject(`Re: ${replyEmail.subject.replace(/^Re:\s*/i, '')}`);
        setHtml(
          `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
            <p>On ${new Date(replyEmail.createdAt).toLocaleDateString()}, ${replyEmail.from} wrote:</p>
            ${replyEmail.html || `<p>${replyEmail.text || ''}</p>`}
          </div>`
        );
      } else if (composeMode === 'replyAll') {
        const originalFrom =
          replyEmail.from.match(/<(.+?)>/)?.[1] || replyEmail.from;
        setTo([originalFrom, ...replyEmail.to.filter((e) => e !== session?.user?.email)]);
        setCc(replyEmail.cc);
        setShowCcBcc(replyEmail.cc.length > 0);
        setSubject(`Re: ${replyEmail.subject.replace(/^Re:\s*/i, '')}`);
        setHtml(
          `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
            <p>On ${new Date(replyEmail.createdAt).toLocaleDateString()}, ${replyEmail.from} wrote:</p>
            ${replyEmail.html || `<p>${replyEmail.text || ''}</p>`}
          </div>`
        );
      } else if (composeMode === 'forward') {
        setSubject(`Fwd: ${replyEmail.subject.replace(/^Fwd:\s*/i, '')}`);
        setHtml(
          `<br/><br/><div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
            <p>---------- Forwarded message ----------</p>
            <p>From: ${replyEmail.from}</p>
            <p>Date: ${new Date(replyEmail.createdAt).toLocaleDateString()}</p>
            <p>Subject: ${replyEmail.subject}</p>
            <p>To: ${replyEmail.to.join(', ')}</p>
            <br/>
            ${replyEmail.html || `<p>${replyEmail.text || ''}</p>`}
          </div>`
        );
      }
    } else {
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject('');
      setHtml('');
      setFromAddress(composeFrom || '');
      setAttachments([]);
      setShowCcBcc(false);
    }
  }, [composeMode, composeReplyTo, session?.user?.email, composeFrom]);

  // Initialize when compose opens
  useState(() => {
    if (isComposeOpen) {
      initializeCompose();
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: AttachmentFile[] = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      newAttachments.push({ file, base64 });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (to.length === 0) return;

    setSendError(null);
    startTransition(async () => {
      const result = await sendEmail({
        from: isAdmin && fromAddress ? fromAddress : undefined,
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject: subject || '(No Subject)',
        html,
        attachments: attachments.map((att) => ({
          filename: att.file.name,
          content: att.base64,
          contentType: att.file.type,
          size: att.file.size,
        })),
        inReplyTo: composeReplyTo?.messageId || undefined,
        threadId: composeReplyTo?.threadId || undefined,
      });

      if (result.success) {
        closeCompose();
        resetForm();
      } else {
        setSendError(result.error || 'Failed to send');
      }
    });
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      await saveDraft({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject: subject || '(No Subject)',
        html,
        attachments: attachments.map((att) => ({
          filename: att.file.name,
          content: att.base64,
          contentType: att.file.type,
          size: att.file.size,
        })),
      });
      closeCompose();
      resetForm();
    });
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject('');
    setHtml('');
    setFromAddress(composeFrom || '');
    setAttachments([]);
    setShowCcBcc(false);
    setSendError(null);
  };

  if (!isComposeOpen) return null;

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
        <h3 className="text-sm font-medium text-foreground">
          {composeMode === 'new'
            ? 'New Message'
            : composeMode === 'reply'
              ? 'Reply'
              : composeMode === 'replyAll'
                ? 'Reply All'
                : 'Forward'}
        </h3>
        <div className="flex items-center gap-1">
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
              resetForm();
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <label className="shrink-0 text-sm text-muted-foreground">
                From
              </label>
              <input
                type="text"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder={`support@${process.env.NEXT_PUBLIC_RESEND_DOMAIN || 'yourdomain.com'}`}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          )}

          {/* Recipients */}
          <RecipientInput label="To" recipients={to} onChange={setTo} />

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
              <RecipientInput label="Cc" recipients={cc} onChange={setCc} />
              <RecipientInput label="Bcc" recipients={bcc} onChange={setBcc} />
            </>
          )}

          {/* Subject */}
          <div className="border-b border-border px-4 py-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>

          {/* Rich editor */}
          <div className="flex-1 overflow-y-auto">
            <RichEditor
              content={html}
              onChange={setHtml}
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
                    <span className="max-w-[120px] truncate text-foreground">
                      {att.file.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatFileSize(att.file.size)}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
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
                {isPending ? 'Sending...' : 'Send'}
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
                onClick={() => {
                  closeCompose();
                  resetForm();
                }}
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
