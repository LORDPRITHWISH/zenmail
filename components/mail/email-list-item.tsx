'use client';

import { EmailItem, useMailStore } from '@/lib/store';
import { getEmail, toggleStar } from '@/app/actions/email-actions';
import { Star, Paperclip, ClockCountdown, ChatsCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface EmailListItemProps {
  email: EmailItem;
  isSelected: boolean;
  onSelect: () => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function extractName(from: string): string {
  const match = from.match(/^"?(.+?)"?\s*<.+>$/);
  return match ? match[1] : from.split('@')[0];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500/10 text-blue-600',
    'bg-emerald-500/10 text-emerald-600',
    'bg-violet-500/10 text-violet-600',
    'bg-amber-500/10 text-amber-600',
    'bg-rose-500/10 text-rose-600',
    'bg-cyan-500/10 text-cyan-600',
    'bg-pink-500/10 text-pink-600',
    'bg-indigo-500/10 text-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function EmailListItem({
  email,
  isSelected,
  onSelect,
}: EmailListItemProps) {
  const router = useRouter();
  const { selectedIds, toggleSelected, labels, openDraft } = useMailStore();
  const [isPending, startTransition] = useTransition();
  const isChecked = selectedIds.has(email.id);
  const emailLabels = email.labels
    ?.map((id) => labels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const isDraft = email.folder === 'drafts';
  const isScheduled = email.folder === 'scheduled';
  // A draft shows who it's going to; everything else shows who it came from.
  const senderName = isDraft || isScheduled
    ? email.to.length > 0
      ? `To: ${email.to.map(extractName).join(', ')}`
      : 'To: (no recipient)'
    : extractName(email.from);
  const snippet = email.text || (email.html ? stripHtml(email.html) : '');

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await toggleStar(email.id);
    });
  };

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelected(email.id);
  };

  const handleClick = () => {
    onSelect();

    // Opening a draft means resuming it, not reading it.
    if (isDraft) {
      startTransition(async () => {
        const result = await getEmail(email.id);
        const full = result.email as Record<string, unknown> | undefined;
        openDraft({
          id: email.id,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          html: (full?.html as string) || '',
          attachments: ((full?.attachments as Record<string, unknown>[]) || []).map((a) => ({
            filename: a.filename as string,
            contentType: a.contentType as string,
            size: a.size as number,
            content: (a.content as string) || '',
          })),
        });
      });
      return;
    }

    router.push(`/email/${email.id}`);
  };

  return (
    <div
      data-email-id={email.id}
      onClick={handleClick}
      className={`group flex cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-3 transition-all duration-150 ${
        isSelected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : email.isRead
            ? 'hover:bg-muted/50'
            : 'bg-primary/[0.02] hover:bg-primary/5'
      }`}
    >
      {/* Checkbox */}
      <div onClick={handleCheckbox} className="shrink-0">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
            isChecked
              ? 'border-primary bg-primary'
              : 'border-border group-hover:border-muted-foreground/40'
          }`}
        >
          {isChecked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6L5 9L10 3"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Star */}
      <button
        onClick={handleStarClick}
        className="shrink-0 transition-colors"
        disabled={isPending}
      >
        <Star
          size={18}
          weight={email.isStarred ? 'fill' : 'regular'}
          className={
            email.isStarred
              ? 'text-amber-400'
              : 'text-muted-foreground/30 hover:text-amber-400/60'
          }
        />
      </button>

      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(senderName)}`}
      >
        {getInitials(senderName)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`truncate text-sm ${
              email.isRead
                ? 'text-foreground/70'
                : 'font-semibold text-foreground'
            }`}
          >
            {senderName}
          </span>
          {(email.threadCount ?? 1) > 1 && (
            <span
              className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground"
              title={`${email.threadCount} messages in this conversation`}
            >
              <ChatsCircle size={12} />
              {email.threadCount}
            </span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {isScheduled && email.scheduledAt ? (
              <span className="flex items-center gap-1 text-primary">
                <ClockCountdown size={12} />
                {formatDate(email.scheduledAt)}
              </span>
            ) : (
              formatDate(email.createdAt)
            )}
          </span>
        </div>
        <p
          className={`truncate text-sm ${
            email.isRead ? 'text-muted-foreground' : 'font-medium text-foreground/80'
          }`}
        >
          {email.subject}
        </p>
        <p className="truncate text-xs text-muted-foreground/60">{snippet}</p>
      </div>

      {/* Label dots */}
      {emailLabels && emailLabels.length > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          {emailLabels.map((l) => (
            <span
              key={l.id}
              title={l.name}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: l.color }}
            />
          ))}
        </div>
      )}

      {/* Attachment indicator */}
      {email.attachments && email.attachments.length > 0 && (
        <Paperclip size={14} className="shrink-0 text-muted-foreground/40" />
      )}

      {/* Unread dot */}
      {!email.isRead && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );
}
