'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { adminGetAllEmails } from '@/app/actions/admin-actions';
import { AdminEmailView } from './admin-email-view';
import {
  MagnifyingGlass,
  Funnel,
  CaretLeft,
  CaretRight,
  Paperclip,
} from '@phosphor-icons/react';

interface Email {
  id: string;
  from: string;
  to: string[];
  subject: string;
  folder: string;
  isRead: boolean;
  createdAt: string;
  user?: { name: string | null; email: string | null };
  attachments: { id: string }[];
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchEmails = useCallback((p: number = page) => {
    startTransition(async () => {
      setIsLoading(true);
      const result = await adminGetAllEmails(p, {
        search: search || undefined,
        folder: folderFilter || undefined,
      });
      setEmails(result.emails as Email[]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setIsLoading(false);
    });
  }, [page, search, folderFilter]);

  useEffect(() => {
    fetchEmails(1);
  }, [folderFilter, fetchEmails]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmails(1);
  };

  if (selectedEmailId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-foreground">Email Details</h1>
        <AdminEmailView
          emailId={selectedEmailId}
          onBack={() => setSelectedEmailId(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">All Emails</h1>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative max-w-md">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all emails..."
              className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-muted-foreground" />
          <select
            value={folderFilter}
            onChange={(e) => {
              setFolderFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm focus:outline-none"
          >
            <option value="">All Folders</option>
            <option value="inbox">Inbox</option>
            <option value="sent">Sent</option>
            <option value="drafts">Drafts</option>
            <option value="trash">Trash</option>
            <option value="spam">Spam</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  From
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Folder
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No emails found
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer ${
                      !email.isRead ? 'bg-primary/[0.02]' : ''
                    }`}
                  >
                    <td className="max-w-[240px] truncate px-4 py-3 text-sm">
                      <span
                        className={
                          email.isRead
                            ? 'text-foreground/70'
                            : 'font-medium text-foreground'
                        }
                      >
                        {email.from}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-sm text-foreground/70">
                      {email.to.join(', ')}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            email.isRead
                              ? 'text-foreground/70'
                              : 'font-medium text-foreground'
                          }
                        >
                          {email.subject}
                        </span>
                        {email.attachments.length > 0 && (
                          <Paperclip
                            size={12}
                            className="shrink-0 text-muted-foreground/40"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {email.folder}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {email.user?.name || email.user?.email || 'Unregistered'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {total} total emails
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                fetchEmails(page - 1);
              }}
              disabled={page <= 1 || isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CaretLeft size={14} />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                fetchEmails(page + 1);
              }}
              disabled={page >= totalPages || isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
