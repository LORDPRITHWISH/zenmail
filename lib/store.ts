import { create } from 'zustand';

export interface EmailItem {
  id: string;
  messageId?: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html?: string;
  text?: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  threadId?: string;
  threadCount?: number;
  scheduledAt?: string | null;
  attachments: {
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }[];
  createdAt: string;
}

/** Attachment carried in memory while composing (base64 payload included). */
export interface ComposeAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: string;
}

/**
 * Everything needed to reopen a compose window exactly as it was: editing a
 * saved draft, or restoring a send the user pulled back with Undo.
 */
export interface ComposeDraft {
  id?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  from?: string;
  inReplyTo?: string;
  threadId?: string;
  scheduledAt?: string; // ISO 8601 when the user picked a send time
  attachments: ComposeAttachment[];
}

/** A send being held briefly so it can be undone before it leaves. */
export interface PendingSend {
  draft: ComposeDraft;
  sendAt: number;
}

export interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface MailState {
  // Current folder
  currentFolder: string;
  setCurrentFolder: (folder: string) => void;

  // Current label (mutually exclusive with folder-based views)
  currentLabelId: string | null;
  setCurrentLabelId: (id: string | null) => void;

  // Selected email
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;

  // Email list
  emails: EmailItem[];
  setEmails: (emails: EmailItem[]) => void;
  patchEmail: (id: string, patch: Partial<EmailItem>) => void;

  // Labels
  labels: LabelItem[];
  setLabels: (labels: LabelItem[]) => void;

  // Pagination
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  setTotalPages: (total: number) => void;

  // Compose
  isComposeOpen: boolean;
  composeFrom?: string;
  composeDraft: ComposeDraft | null;
  /** Bumped on every open so the compose window remounts with fresh state. */
  composeKey: number;
  openCompose: (fromAddress?: string) => void;
  openDraft: (draft: ComposeDraft) => void;
  closeCompose: () => void;

  // Undo send
  pendingSend: PendingSend | null;
  queueSend: (draft: ComposeDraft, holdMs: number) => void;
  clearPendingSend: () => void;

  // Reply / Forward state
  composeMode: 'new' | 'reply' | 'replyAll' | 'forward';
  composeReplyTo: EmailItem | null;
  openReply: (email: EmailItem, mode: 'reply' | 'replyAll' | 'forward') => void;

  // Selection (bulk actions)
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Sidebar collapsed
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Unread counts
  unreadCounts: Record<string, number>;
  setUnreadCounts: (counts: Record<string, number>) => void;
}

export const useMailStore = create<MailState>((set, get) => ({
  currentFolder: 'inbox',
  setCurrentFolder: (folder) =>
    set({ currentFolder: folder, currentLabelId: null, selectedEmailId: null, page: 1 }),

  currentLabelId: null,
  setCurrentLabelId: (id) => set({ currentLabelId: id, selectedEmailId: null, page: 1 }),

  selectedEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  emails: [],
  setEmails: (emails) => set({ emails }),
  patchEmail: (id, patch) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  labels: [],
  setLabels: (labels) => set({ labels }),

  page: 1,
  totalPages: 1,
  setPage: (page) => set({ page }),
  setTotalPages: (totalPages) => set({ totalPages }),

  isComposeOpen: false,
  composeFrom: undefined,
  composeDraft: null,
  composeKey: 0,
  openCompose: (fromAddress) =>
    set((state) => ({
      isComposeOpen: true,
      composeMode: 'new',
      composeReplyTo: null,
      composeDraft: null,
      composeFrom: fromAddress,
      composeKey: state.composeKey + 1,
    })),
  openDraft: (draft) =>
    set((state) => ({
      isComposeOpen: true,
      composeMode: 'new',
      composeReplyTo: null,
      composeDraft: draft,
      composeFrom: draft.from,
      composeKey: state.composeKey + 1,
    })),
  closeCompose: () =>
    set({ isComposeOpen: false, composeReplyTo: null, composeDraft: null, composeFrom: undefined }),

  pendingSend: null,
  queueSend: (draft, holdMs) => set({ pendingSend: { draft, sendAt: Date.now() + holdMs } }),
  clearPendingSend: () => set({ pendingSend: null }),

  composeMode: 'new',
  composeReplyTo: null,
  openReply: (email, mode) =>
    set((state) => ({
      isComposeOpen: true,
      composeMode: mode,
      composeReplyTo: email,
      composeDraft: null,
      composeKey: state.composeKey + 1,
    })),

  selectedIds: new Set(),
  toggleSelected: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    }),
  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.emails.map((e) => e.id)),
    })),
  clearSelection: () => set({ selectedIds: new Set() }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  unreadCounts: {},
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
}));
