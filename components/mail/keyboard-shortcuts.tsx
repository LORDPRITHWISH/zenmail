'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMailStore } from '@/lib/store';
import {
  deleteEmails,
  moveToFolder,
  toggleStar,
  markAsUnread,
  getUnreadCounts,
} from '@/app/actions/email-actions';
import { X } from '@phosphor-icons/react';

const SHORTCUTS: [string, string][] = [
  ['j / ↓', 'Next email'],
  ['k / ↑', 'Previous email'],
  ['Enter / o', 'Open email'],
  ['u', 'Back to the list'],
  ['c', 'Compose'],
  ['r', 'Reply'],
  ['a', 'Reply all'],
  ['f', 'Forward'],
  ['e', 'Archive'],
  ['#', 'Move to trash'],
  ['s', 'Star / unstar'],
  ['x', 'Select / deselect'],
  ['U', 'Mark unread'],
  ['/', 'Search'],
  ['?', 'This list'],
];

/** True when the user is typing, so letters stay letters. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    emails,
    setEmails,
    selectedEmailId,
    setSelectedEmailId,
    openCompose,
    openReply,
    isComposeOpen,
    toggleSelected,
    patchEmail,
    setUnreadCounts,
  } = useMailStore();

  // On /email/<id> the open message is the target; in a list it's the cursor.
  const openEmailId = pathname.startsWith('/email/') ? pathname.split('/')[2] : null;
  const targetId = openEmailId ?? selectedEmailId;

  const refreshCounts = useCallback(async () => {
    const counts = await getUnreadCounts();
    if (counts.counts) setUnreadCounts(counts.counts);
  }, [setUnreadCounts]);

  /** Archive/trash: drop it from the list, and leave the reader if we're in it. */
  const removeFromView = useCallback(
    (id: string) => {
      setEmails(emails.filter((e) => e.id !== id));
      if (openEmailId === id) router.back();
      else if (selectedEmailId === id) setSelectedEmailId(null);
      refreshCounts();
    },
    [emails, setEmails, openEmailId, selectedEmailId, setSelectedEmailId, router, refreshCounts]
  );

  const move = useCallback(
    (delta: number) => {
      if (emails.length === 0) return;
      const current = emails.findIndex((e) => e.id === selectedEmailId);
      const next = Math.min(
        emails.length - 1,
        Math.max(0, current === -1 ? 0 : current + delta)
      );
      setSelectedEmailId(emails[next].id);
      document
        .querySelector(`[data-email-id="${emails[next].id}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    },
    [emails, selectedEmailId, setSelectedEmailId]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        setHelpOpen(false);
        return;
      }

      // Shortcuts would type into the composer otherwise.
      if (isComposeOpen || isTyping(e.target)) return;

      const email = emails.find((x) => x.id === targetId);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          move(1);
          return;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          move(-1);
          return;
        case 'Enter':
        case 'o':
          if (selectedEmailId && !openEmailId) {
            e.preventDefault();
            router.push(`/email/${selectedEmailId}`);
          }
          return;
        case 'u':
          if (openEmailId) {
            e.preventDefault();
            router.back();
          }
          return;
        case 'c':
          e.preventDefault();
          openCompose();
          return;
        case '/':
          e.preventDefault();
          (document.getElementById('zenmail-search') as HTMLInputElement | null)?.focus();
          return;
        case '?':
          e.preventDefault();
          setHelpOpen((v) => !v);
          return;
      }

      if (!targetId) return;

      switch (e.key) {
        case 'e':
          e.preventDefault();
          moveToFolder([targetId], 'archive').then(() => removeFromView(targetId));
          return;
        case '#':
          e.preventDefault();
          deleteEmails([targetId]).then(() => removeFromView(targetId));
          return;
        case 's':
          e.preventDefault();
          patchEmail(targetId, { isStarred: !email?.isStarred });
          toggleStar(targetId);
          return;
        case 'x':
          e.preventDefault();
          toggleSelected(targetId);
          return;
        case 'U':
          e.preventDefault();
          patchEmail(targetId, { isRead: false });
          markAsUnread([targetId]).then(refreshCounts);
          return;
        case 'r':
        case 'a':
        case 'f':
          if (email) {
            e.preventDefault();
            openReply(email, e.key === 'r' ? 'reply' : e.key === 'a' ? 'replyAll' : 'forward');
          }
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    emails,
    targetId,
    selectedEmailId,
    openEmailId,
    isComposeOpen,
    move,
    router,
    openCompose,
    openReply,
    patchEmail,
    toggleSelected,
    removeFromView,
    refreshCounts,
  ]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h2>
          <button
            onClick={() => setHelpOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
