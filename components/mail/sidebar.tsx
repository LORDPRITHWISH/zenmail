'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useMailStore, LabelItem } from '@/lib/store';
import { createLabel, deleteLabel } from '@/app/actions/label-actions';
import { FOLDERS } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Tray,
  PaperPlaneTilt,
  PencilSimpleLine,
  Star,
  Archive,
  Warning,
  Trash,
  Plus,
  X,
  CaretLeft,
  CaretRight,
  SignOut,
  GearSix,
  ShieldCheck,
  ClockCountdown,
} from '@phosphor-icons/react';

const LABEL_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

const FOLDER_ICONS: Record<string, React.ElementType> = {
  Tray,
  PaperPlaneTilt,
  PencilSimpleLine,
  ClockCountdown,
  Star,
  Archive,
  Warning,
  Trash,
};

export function MailSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    sidebarCollapsed,
    toggleSidebar,
    openCompose,
    unreadCounts,
    setCurrentFolder,
    labels,
    setLabels,
    setCurrentLabelId,
  } = useMailStore();

  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [labelToDelete, setLabelToDelete] = useState<LabelItem | null>(null);

  const isAdmin = (session?.user as Record<string, unknown>)?.role === 'admin';

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    router.push(`/${folderId}`);
  };

  const handleLabelClick = (labelId: string) => {
    setCurrentLabelId(labelId);
    router.push(`/label/${labelId}`);
  };

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name) {
      setIsAddingLabel(false);
      return;
    }
    const result = await createLabel(name, newLabelColor);
    if (result.label) {
      setLabels([...labels, result.label].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewLabelName('');
    setNewLabelColor(LABEL_COLORS[0]);
    setIsAddingLabel(false);
  };

  const handleDeleteLabelClick = (e: React.MouseEvent, label: LabelItem) => {
    e.stopPropagation();
    setLabelToDelete(label);
  };

  const confirmDeleteLabel = async () => {
    if (!labelToDelete) return;
    const id = labelToDelete.id;
    setLabels(labels.filter((l) => l.id !== id));
    setLabelToDelete(null);
    await deleteLabel(id);
    if (pathname === `/label/${id}`) router.push('/inbox');
  };

  const activeFolderId =
    pathname.split('/').filter(Boolean)[0] || 'inbox';
  const activeLabelId =
    activeFolderId === 'label' ? pathname.split('/').filter(Boolean)[1] : null;

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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-primary/20">
              <img src="/zenmail.png" alt="ZenMail Logo" className="w-full h-full object-cover" />
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
          onClick={() => openCompose()}
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
            const Icon = FOLDER_ICONS[folder.icon];
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

        {/* Labels */}
        {!sidebarCollapsed && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">
                Labels
              </span>
              <button
                onClick={() => setIsAddingLabel(true)}
                className="flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="New label"
              >
                <Plus size={14} weight="bold" />
              </button>
            </div>

            <div className="space-y-0.5">
              {labels.map((label) => {
                const isActive = activeLabelId === label.id;
                return (
                  <button
                    key={label.id}
                    onClick={() => handleLabelClick(label.id)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 truncate text-left">{label.name}</span>
                    <span
                      onClick={(e) => handleDeleteLabelClick(e, label)}
                      className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                      title="Delete label"
                    >
                      <X size={12} weight="bold" />
                    </span>
                  </button>
                );
              })}

              {isAddingLabel && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
                  <input
                    autoFocus
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateLabel();
                      if (e.key === 'Escape') {
                        setIsAddingLabel(false);
                        setNewLabelName('');
                      }
                    }}
                    placeholder="Label name"
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="flex items-center gap-1.5">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`h-4 w-4 rounded-full transition-transform ${
                          newLabelColor === color ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-foreground/30' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setIsAddingLabel(false);
                        setNewLabelName('');
                      }}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateLabel}
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => router.push('/settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            activeFolderId === 'settings'
              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          }`}
          title={sidebarCollapsed ? 'Settings' : undefined}
        >
          <GearSix size={20} className="shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>

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
          onClick={() => signOut({ callbackUrl: '/' })}
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
                referrerPolicy="no-referrer"
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

      <ConfirmDialog
        open={labelToDelete !== null}
        title={`Delete "${labelToDelete?.name}"?`}
        description="This label will be removed from every email it's applied to. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteLabel}
        onCancel={() => setLabelToDelete(null)}
      />
    </aside>
  );
}
