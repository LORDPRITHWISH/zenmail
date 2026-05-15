'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { MailSidebar } from '@/components/mail/sidebar';
import { MailHeader } from '@/components/mail/header';
import { ComposeDialog } from '@/components/mail/compose-dialog';
import { useMailStore } from '@/lib/store';
import { getUnreadCounts } from '@/app/actions/email-actions';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { sidebarCollapsed, setUnreadCounts } = useMailStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fetch unread counts on mount and periodically
    const fetchCounts = async () => {
      const result = await getUnreadCounts();
      if (result.counts) {
        setUnreadCounts(result.counts);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [setUnreadCounts]);

  return (
    <SessionProvider>
      <div className="flex h-svh overflow-hidden bg-background">
        <MailSidebar />
        <div
          className="flex flex-1 flex-col overflow-hidden transition-all duration-300"
          style={mounted ? {
            marginLeft: sidebarCollapsed ? '64px' : '256px',
          } : {
            marginLeft: '256px',
          }}
        >
          <MailHeader />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
        <ComposeDialog />
      </div>
    </SessionProvider>
  );
}
