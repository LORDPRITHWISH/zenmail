'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useMailStore } from '@/lib/store';
import {
  Tray,
  PaperPlaneTilt,
  PencilSimpleLine,
  Star,
  Archive,
  Warning,
  Trash,
  Plus,
  CaretLeft,
  CaretRight,
  SignOut,
  GearSix,
  ShieldCheck,
} from '@phosphor-icons/react';

const FOLDER_ICONS: Record<string, React.ElementType> = {
  inbox: Tray,
  sent: PaperPlaneTilt,
  drafts: PencilSimpleLine,
  starred: Star,
  archive: Archive,
  spam: Warning,
  trash: Trash,
};

const FOLDERS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'starred', label: 'Starred' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'archive', label: 'Archive' },
  { id: 'spam', label: 'Spam' },
  { id: 'trash', label: 'Trash' },
];

export function MailSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    sidebarCollapsed,
    toggleSidebar,
    openCompose,
    unreadCounts,
    currentFolder,
    setCurrentFolder,
  } = useMailStore();

  const isAdmin = (session?.user as Record<string, unknown>)?.role === 'admin';

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    router.push(`/${folderId}`);
  };

  const activeFolderId =
    pathname.split('/').filter(Boolean)[0] || 'inbox';

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-svh flex-col border-r border-border bg-sidebar transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo & Collapse toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-primary"
              >
                <path
                  d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M2 6L12 13L22 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              ZenMail
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {sidebarCollapsed ? (
            <CaretRight size={16} weight="bold" />
          ) : (
            <CaretLeft size={16} weight="bold" />
          )}
        </button>
      </div>

      {/* Compose button */}
      <div className="p-3">
        <button
          onClick={openCompose}
          className={`flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.97] ${
            sidebarCollapsed ? 'w-full' : 'w-full'
          }`}
        >
          <Plus size={18} weight="bold" />
          {!sidebarCollapsed && <span>Compose</span>}
        </button>
      </div>

      {/* Folder list */}
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5">
          {FOLDERS.map((folder) => {
            const Icon = FOLDER_ICONS[folder.id];
            const isActive = activeFolderId === folder.id;
            const unread = unreadCounts[folder.id] || 0;

            return (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
                title={sidebarCollapsed ? folder.label : undefined}
              >
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={`shrink-0 ${
                    isActive
                      ? 'text-primary'
                      : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                  }`}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{folder.label}</span>
                    {unread > 0 && (
                      <span className="min-w-[20px] rounded-full bg-primary/10 px-1.5 py-0.5 text-center text-xs font-semibold text-primary">
                        {unread}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && unread > 0 && (
                  <span className="absolute right-1 top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title={sidebarCollapsed ? 'Admin Panel' : undefined}
          >
            <ShieldCheck size={20} className="shrink-0 text-amber-500" />
            {!sidebarCollapsed && <span>Admin Panel</span>}
          </button>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={sidebarCollapsed ? 'Sign Out' : undefined}
        >
          <SignOut size={20} className="shrink-0" />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* User info */}
      {session?.user && !sidebarCollapsed && (
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {session.user.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
