'use client';

import { SessionProvider } from 'next-auth/react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { ComposeDialog } from '@/components/mail/compose-dialog';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-svh overflow-hidden bg-background">
        <AdminSidebar />
        <div className="ml-60 flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <ComposeDialog />
      </div>
    </SessionProvider>
  );
}
