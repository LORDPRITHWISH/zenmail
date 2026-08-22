'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { MailSidebar } from '@/components/mail/sidebar';
import { MailHeader } from '@/components/mail/header';
import { ComposeDialog } from '@/components/mail/compose-dialog';
import { SendToast } from '@/components/mail/send-toast';
import { KeyboardShortcuts } from '@/components/mail/keyboard-shortcuts';
import { useMailStore } from '@/lib/store';
import { getUnreadCounts } from '@/app/actions/email-actions';
import { getLabels } from '@/app/actions/label-actions';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { sidebarCollapsed, setUnreadCounts, setLabels, isComposeOpen, composeKey } =
    useMailStore();

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

  useEffect(() => {
    getLabels().then((result) => {
      if (result.labels) setLabels(result.labels);
    });
  }, [setLabels]);

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
        {isComposeOpen && <ComposeDialog key={composeKey} />}
        <SendToast />
        <KeyboardShortcuts />
      </div>
    </SessionProvider>
  );
}
