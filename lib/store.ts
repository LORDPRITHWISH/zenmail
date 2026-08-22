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

  // Compose
  isComposeOpen: boolean;
  composeFrom?: string;
  openCompose: (fromAddress?: string) => void;
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
  setCurrentFolder: (folder) => set({ currentFolder: folder, currentLabelId: null, selectedEmailId: null }),

  currentLabelId: null,
  setCurrentLabelId: (id) => set({ currentLabelId: id, selectedEmailId: null }),

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

  isComposeOpen: false,
  composeFrom: undefined,
  openCompose: (fromAddress) => set({ isComposeOpen: true, composeMode: 'new', composeReplyTo: null, composeFrom: fromAddress }),
  closeCompose: () => set({ isComposeOpen: false, composeReplyTo: null, composeFrom: undefined }),

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
