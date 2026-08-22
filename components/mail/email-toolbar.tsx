'use client';

import { useMailStore } from '@/lib/store';
import {
  deleteEmails,
  markAsRead,
  markAsUnread,
  moveToFolder,
  emptyTrash,
  markFolderRead,
} from '@/app/actions/email-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import {
  Trash,
  Archive,
  EnvelopeOpen,
  EnvelopeSimple,
  Warning,
  CheckSquare,
  Square,
} from '@phosphor-icons/react';
import { useTransition } from 'react';

interface EmailToolbarProps {
  folder?: string;
  onRefresh: () => void;
}

export function EmailToolbar({ folder, onRefresh }: EmailToolbarProps) {
  const { selectedIds, emails, selectAll, clearSelection, unreadCounts } = useMailStore();
  const [isPending, startTransition] = useTransition();
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === emails.length && emails.length > 0;
  const folderUnread = folder ? unreadCounts[folder] ?? 0 : 0;

  const handleAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      await action();
      clearSelection();
      onRefresh();
    });
  };

  return (
    <div className="flex items-center gap-1 border-b border-border px-4 py-2">
      {/* Select all */}
      <button
        onClick={() => (allSelected ? clearSelection() : selectAll())}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={allSelected ? 'Deselect all' : 'Select all'}
      >
        {allSelected ? (
          <CheckSquare size={18} weight="fill" className="text-primary" />
        ) : (
          <Square size={18} />
        )}
      </button>

      {hasSelection && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <span className="mr-2 text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>

          <button
            onClick={() =>
              handleAction(() =>
                markAsRead(Array.from(selectedIds))
              )
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Mark as read"
          >
            <EnvelopeOpen size={18} />
          </button>

          <button
            onClick={() =>
              handleAction(() =>
                markAsUnread(Array.from(selectedIds))
              )
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Mark as unread"
          >
            <EnvelopeSimple size={18} />
          </button>

          <button
            onClick={() =>
              handleAction(() =>
                moveToFolder(Array.from(selectedIds), 'archive')
              )
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Archive"
          >
            <Archive size={18} />
          </button>

          <button
            onClick={() =>
              handleAction(() =>
                moveToFolder(Array.from(selectedIds), 'spam')
              )
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Mark as spam"
          >
            <Warning size={18} />
          </button>

          <button
            onClick={() =>
              handleAction(() => deleteEmails(Array.from(selectedIds)))
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            title="Delete"
          >
            <Trash size={18} />
          </button>
        </>
      )}

      <div className="flex-1" />

      {!hasSelection && folder === 'trash' && emails.length > 0 && (
        <button
          onClick={() => setConfirmEmptyTrash(true)}
          disabled={isPending}
          className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          Empty trash
        </button>
      )}

      {!hasSelection && folderUnread > 0 && (
        <button
          onClick={() => handleAction(() => markFolderRead(folder!))}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <EnvelopeOpen size={14} />
          Mark all read
        </button>
      )}

      <ConfirmDialog
        open={confirmEmptyTrash}
        title="Empty the trash?"
        description="Every email in the trash will be permanently deleted. This can't be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={() => {
          setConfirmEmptyTrash(false);
          handleAction(() => emptyTrash());
        }}
        onCancel={() => setConfirmEmptyTrash(false)}
      />
    </div>
  );
}
