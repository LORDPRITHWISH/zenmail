'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getEmail, toggleStar, deleteEmails } from '@/app/actions/email-actions';
import { useMailStore } from '@/lib/store';
import {
  ArrowLeft,
  Star,
  Trash,
  Archive,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowsClockwise,
  Paperclip,
  DownloadSimple,
} from '@phosphor-icons/react';

interface EmailViewProps {
  emailId: string;
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

export function EmailView({ emailId }: EmailViewProps) {
  const router = useRouter();
  const { openReply } = useMailStore();
  const [email, setEmail] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsLoading(true);
    getEmail(emailId).then((result) => {
      if (result.email) {
        setEmail(result.email);
      }
      setIsLoading(false);
    });
  }, [emailId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Email not found</p>
      </div>
    );
  }

  const senderName = extractName(email.from as string);
  const senderEmail = extractEmail(email.from as string);
  const attachments = (email.attachments as Array<Record<string, unknown>>) || [];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1" />

        <button
          onClick={() =>
            startTransition(async () => {
              await toggleStar(emailId);
              const result = await getEmail(emailId);
              if (result.email) setEmail(result.email);
            })
          }
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <Star
            size={18}
            weight={(email.isStarred as boolean) ? 'fill' : 'regular'}
            className={(email.isStarred as boolean) ? 'text-amber-400' : ''}
          />
        </button>

        <button
          onClick={() =>
            startTransition(async () => {
              await deleteEmails([emailId]);
              router.back();
            })
          }
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash size={18} />
        </button>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
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
              {(email.to as string[]).map((t: string) => extractName(t)).join(', ')}
              {(email.cc as string[])?.length > 0 && (
                <span>
                  , cc:{' '}
                  {(email.cc as string[])
                    .map((t: string) => extractName(t))
                    .join(', ')}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground/60">
              {formatFullDate(email.createdAt as string)}
            </div>
          </div>
        </div>

        {/* Email body */}
        <div className="rounded-xl border border-border bg-card p-6">
          {email.html ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: email.html as string }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-foreground/80">
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
            <div className="grid grid-cols-2 gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id as string}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
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

        {/* Reply actions */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() =>
              openReply(email as unknown as import('@/lib/store').EmailItem, 'reply')
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowBendUpLeft size={16} />
            Reply
          </button>
          <button
            onClick={() =>
              openReply(email as unknown as import('@/lib/store').EmailItem, 'replyAll')
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowsClockwise size={16} />
            Reply All
          </button>
          <button
            onClick={() =>
              openReply(email as unknown as import('@/lib/store').EmailItem, 'forward')
            }
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowBendUpRight size={16} />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}
