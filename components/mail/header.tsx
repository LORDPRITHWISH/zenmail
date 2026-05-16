'use client';

import { useSession } from 'next-auth/react';
import { useMailStore } from '@/lib/store';
import {
  MagnifyingGlass,
  ArrowsClockwise,
  Moon,
  Sun,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useCallback, useState, useTransition } from 'react';
import { getEmails, getUnreadCounts } from '@/app/actions/email-actions';

export function MailHeader() {
  const { data: session } = useSession();
  const { searchQuery, setSearchQuery, currentFolder, setEmails, setIsLoading, setUnreadCounts } =
    useMailStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (session?.user?.email) {
      const zenuxMail = session.user.email.split('@')[0] + '@zenux.live';
      navigator.clipboard.writeText(zenuxMail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayMail = session?.user?.email ? session.user.email.split('@')[0] + '@zenux.live' : '';

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await getEmails(currentFolder, 1, searchQuery || undefined);
      if (result.emails) {
        setEmails(result.emails as never[]);
      }
      const counts = await getUnreadCounts();
      if (counts.counts) {
        setUnreadCounts(counts.counts);
      }
      setIsLoading(false);
    });
  }, [currentFolder, searchQuery, setEmails, setIsLoading, setUnreadCounts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    startTransition(async () => {
      setIsLoading(true);
      const result = await getEmails(
        currentFolder,
        1,
        localSearch || undefined
      );
      if (result.emails) {
        setEmails(result.emails as never[]);
      }
      setIsLoading(false);
    });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-1 items-center">
        <div className="relative flex w-full max-w-xl items-center">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 text-muted-foreground/50"
          />
          <input
            type="text"
            placeholder="Search emails..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-muted/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {displayMail && (
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground shadow-sm">
            <span className="max-w-[200px] truncate text-xs font-medium text-muted-foreground">
              {displayMail}
            </span>
            <button
              onClick={handleCopyEmail}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Copy email address"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Refresh"
        >
          <ArrowsClockwise
            size={18}
            className={isPending ? 'animate-spin' : ''}
          />
        </button>

        <button
          onClick={() =>
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
      </div>
    </header>
  );
}
