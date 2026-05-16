'use client';

import { useEffect, useState } from 'react';
import { adminGetEmail } from '@/app/actions/admin-actions';
import {
  ArrowLeft,
  Paperclip,
  DownloadSimple,
} from '@phosphor-icons/react';

interface AdminEmailViewProps {
  emailId: string;
  onBack: () => void;
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractName(from: string): string {
  const match = from.match(/^"?(.+?)"?\s*<.+>$/);
  return match ? match[1] : from.split('@')[0];
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function AdminEmailView({ emailId, onBack }: AdminEmailViewProps) {
  const [email, setEmail] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminGetEmail(emailId).then((result) => {
      if (active) {
        if (result.email) {
          setEmail(result.email);
        }
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, [emailId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-muted-foreground">Email not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const senderName = extractName(email.from as string);
  const senderEmail = extractEmail(email.from as string);
  const attachments =
    (email.attachments as Array<Record<string, unknown>>) || [];

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Back to all emails</span>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Subject */}
        <h1 className="mb-6 text-xl font-semibold text-foreground">
          {email.subject as string}
        </h1>

        {/* Sender info */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(senderName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-foreground">{senderName}</span>
              <span className="text-xs text-muted-foreground">
                &lt;{senderEmail}&gt;
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              to{' '}
              {(email.to as string[])
                .map((t: string) => extractName(t))
                .join(', ')}
              {(email.cc as string[])?.length > 0 && (
                <span>
                  , cc:{' '}
                  {(email.cc as string[])
                    .map((t: string) => extractName(t))
                    .join(', ')}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/60">
              {formatFullDate(email.createdAt as string)}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {email.folder as string}
              </span>
            </div>
          </div>
        </div>

        {/* Email body */}
        <div className="rounded-xl border border-border bg-muted/10 p-6">
          {email.html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: email.html as string }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/80">
              {email.text as string}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Paperclip size={16} />
              {attachments.length} Attachment{attachments.length > 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((att) => (
                <div
                  key={att.id as string}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {(att.filename as string)
                      .split('.')
                      .pop()
                      ?.toUpperCase()
                      .slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {att.filename as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.size as number)}
                    </p>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                    <DownloadSimple size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
