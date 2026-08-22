'use client';

import { useCallback, useEffect, useTransition } from 'react';
import { useMailStore } from '@/lib/store';
import { getEmails, getUnreadCounts } from '@/app/actions/email-actions';
import { EmailListItem } from './email-list-item';
import { EmailToolbar } from './email-toolbar';
import { Tray } from '@phosphor-icons/react';

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
  } = useMailStore();
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await getEmails(folder || '', 1, searchQuery || undefined, labelId);
      if (result.emails) {
        setEmails(result.emails as never[]);
      }
      const counts = await getUnreadCounts();
      if (counts.counts) setUnreadCounts(counts.counts);
      setIsLoading(false);
    });
  }, [folder, labelId, searchQuery, setEmails, setIsLoading, setUnreadCounts]);

  useEffect(() => {
    if (labelId) {
      setCurrentLabelId(labelId);
    } else {
      setCurrentFolder(folder || 'inbox');
    }
    refresh();
  }, [folder, labelId, refresh, setCurrentFolder, setCurrentLabelId]);

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
            {labelId
              ? `No emails labeled "${activeLabel?.name ?? ''}".`
              : folder === 'inbox'
                ? "Your inbox is empty. Enjoy the zen!"
                : `No emails in ${folder}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EmailToolbar onRefresh={refresh} />
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
    </div>
  );
}
