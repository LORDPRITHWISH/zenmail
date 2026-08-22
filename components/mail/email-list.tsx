'use client';

import { useCallback, useEffect, useTransition } from 'react';
import { useMailStore } from '@/lib/store';
import { getEmails, getUnreadCounts } from '@/app/actions/email-actions';
import { EmailListItem } from './email-list-item';
import { EmailToolbar } from './email-toolbar';
import { EMAILS_PER_PAGE } from '@/lib/constants';
import { Tray, CaretLeft, CaretRight } from '@phosphor-icons/react';

interface EmailListProps {
  folder?: string;
  labelId?: string;
}

export function EmailList({ folder, labelId }: EmailListProps) {
  const {
    emails,
    setEmails,
    setCurrentFolder,
    setCurrentLabelId,
    selectedEmailId,
    setSelectedEmailId,
    isLoading,
    setIsLoading,
    searchQuery,
    setUnreadCounts,
    labels,
    page,
    setPage,
    totalPages,
    setTotalPages,
    clearSelection,
  } = useMailStore();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await getEmails(folder || '', page, searchQuery || undefined, labelId);
      if (result.emails) {
        setEmails(result.emails as never[]);
        setTotalPages(result.totalPages || 1);
      }
      const counts = await getUnreadCounts();
      if (counts.counts) setUnreadCounts(counts.counts);
      setIsLoading(false);
    });
  }, [folder, labelId, searchQuery, page, setEmails, setTotalPages, setIsLoading, setUnreadCounts]);

  useEffect(() => {
    if (labelId) {
      setCurrentLabelId(labelId);
    } else {
      setCurrentFolder(folder || 'inbox');
    }
  }, [folder, labelId, setCurrentFolder, setCurrentLabelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const goToPage = (next: number) => {
    clearSelection();
    setSelectedEmailId(null);
    setPage(next);
  };

  const activeLabel = labelId ? labels.find((l) => l.id === labelId) : undefined;

  if (isLoading || isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading emails...</p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <Tray size={40} className="text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No emails</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? `Nothing matches "${searchQuery}".`
              : labelId
                ? `No emails labeled "${activeLabel?.name ?? ''}".`
                : folder === 'inbox'
                  ? 'Your inbox is empty. Enjoy the zen!'
                  : `No emails in ${folder}.`}
          </p>
          {page > 1 && (
            <button
              onClick={() => goToPage(1)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Back to the first page
            </button>
          )}
        </div>
      </div>
    );
  }

  const firstOnPage = (page - 1) * EMAILS_PER_PAGE + 1;

  return (
    <div className="flex h-full flex-col">
      <EmailToolbar folder={folder} onRefresh={refresh} />
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmailId === email.id}
            onSelect={() => setSelectedEmailId(email.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            {firstOnPage}–{firstOnPage + emails.length - 1} · page {page} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            title="Newer"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            title="Older"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
