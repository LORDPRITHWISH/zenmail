'use client';

import { useEffect, useState, useTransition } from 'react';
import { adminGetAllEmails } from '@/app/actions/admin-actions';
import { useMailStore } from '@/lib/store';
import { ArrowLeft, PencilSimple, Tray, CaretLeft, CaretRight, Paperclip, EnvelopeOpen, Copy, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import { use } from 'react';

// Similar to EmailItem
interface Email {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  createdAt: string;
  isRead: boolean;
  attachments: { id: string, filename: string, size: number }[];
}

export default function AdminInboxPage({ params }: { params: Promise<{ email: string }> }) {
  const { email: encodedEmail } = use(params);
  const emailAddress = decodeURIComponent(encodedEmail);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const openCompose = useMailStore(s => s.openCompose);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchEmails = (p: number) => {
    startTransition(async () => {
      setIsLoading(true);
      const res = await adminGetAllEmails(p, { to: emailAddress });
      setEmails(res.emails as unknown as Email[]);
      setTotalPages(res.totalPages);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchEmails(1);
  }, [emailAddress]);

  function extractName(from: string): string {
    const match = from.match(/^"?(.+?)"?\s*<.+>$/);
    return match ? match[1] : from.split('@')[0];
  }

  return (
    <div className="flex h-[calc(100svh-90px)] flex-col gap-3">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/inboxes"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            title="Back to Inboxes"
          >
            <ArrowLeft size={16} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold text-foreground">Inbox: {emailAddress}</h1>
              <button
                onClick={handleCopyEmail}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Copy email address"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Admin View</p>
          </div>
        </div>
        <button
          onClick={() => openCompose(emailAddress)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow"
        >
          <PencilSimple size={16} weight="bold" />
          Compose As
        </button>
      </div>

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-md">
        {/* Left: Email List - Resizable */}
        <div 
          className="flex flex-col border-r border-border bg-card/40 relative group"
          style={{ resize: 'horizontal', overflow: 'hidden', width: '340px', minWidth: '260px', maxWidth: '50vw' }}
        >
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <Tray size={32} weight="duotone" className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No emails found</p>
              </div>
            ) : (
              emails.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEmail(e)}
                  className={`group cursor-pointer border-b border-border/40 px-3 py-2.5 transition-all ${
                    selectedEmail?.id === e.id
                      ? 'bg-primary/10 border-l-2 border-l-primary shadow-inner'
                      : 'border-l-2 border-l-transparent hover:bg-muted/60'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`truncate text-sm ${!e.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {extractName(e.from)}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0 ml-2">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`truncate text-xs mb-1 ${!e.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {e.subject}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[11px] text-muted-foreground/60 flex-1">
                      {e.text ? e.text.substring(0, 80) : (e.html ? e.html.replace(/<[^>]+>/g, '').substring(0, 80) : '')}
                    </span>
                    {e.attachments && e.attachments.length > 0 && (
                       <Paperclip size={12} weight="bold" className="text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Pagination - extra pr-4 to avoid overlap with native resize handle */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-2 py-1.5 shadow-[0_-1px_2px_rgba(0,0,0,0.02)] pr-4">
             <button
                onClick={() => { setPage(p => p - 1); fetchEmails(page - 1); }}
                disabled={page <= 1 || isPending}
                className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
             ><CaretLeft size={12} weight="bold"/></button>
             <span className="text-[10px] font-medium text-muted-foreground">Page {page} of {totalPages}</span>
             <button
                onClick={() => { setPage(p => p + 1); fetchEmails(page + 1); }}
                disabled={page >= totalPages || isPending}
                className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
             ><CaretRight size={12} weight="bold"/></button>
          </div>
        </div>

        {/* Right: Email View */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-background p-5 relative">
          {selectedEmail ? (
            <div className="mx-auto w-full max-w-3xl rounded-lg border border-border/50 bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-extrabold text-foreground tracking-tight">{selectedEmail.subject}</h2>
              <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <div className="font-semibold text-foreground text-sm">{selectedEmail.from}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium">To: {selectedEmail.to.join(', ')}</div>
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </div>
              </div>
              
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedEmail.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-xs shadow-sm transition-colors hover:bg-muted/40 cursor-pointer">
                      <Paperclip size={14} weight="bold" className="text-primary/70" />
                      <span className="max-w-[180px] truncate font-medium">{att.filename}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {Math.round(att.size / 1024)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedEmail.html ? (
                 <div
                   className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80"
                   dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                 />
              ) : (
                 <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                   {selectedEmail.text}
                 </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <EnvelopeOpen size={48} weight="duotone" className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Select an email to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
