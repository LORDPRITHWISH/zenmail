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
  attachments: {
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }[];
  createdAt: string;
}

interface MailState {
  // Current folder
  currentFolder: string;
  setCurrentFolder: (folder: string) => void;

  // Selected email
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;

  // Email list
  emails: EmailItem[];
  setEmails: (emails: EmailItem[]) => void;

  // Compose
  isComposeOpen: boolean;
  openCompose: () => void;
  closeCompose: () => void;

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
  setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmailId: null }),

  selectedEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  emails: [],
  setEmails: (emails) => set({ emails }),

  isComposeOpen: false,
  openCompose: () => set({ isComposeOpen: true, composeMode: 'new', composeReplyTo: null }),
  closeCompose: () => set({ isComposeOpen: false, composeReplyTo: null }),

  composeMode: 'new',
  composeReplyTo: null,
  openReply: (email, mode) =>
    set({ isComposeOpen: true, composeMode: mode, composeReplyTo: email }),

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
  setSearchQuery: (query) => set({ searchQuery: query }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  unreadCounts: {},
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
}));
