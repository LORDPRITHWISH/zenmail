// Folder configuration
export const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'Tray' },
  { id: 'sent', label: 'Sent', icon: 'PaperPlaneTilt' },
  { id: 'drafts', label: 'Drafts', icon: 'PencilSimpleLine' },
  { id: 'starred', label: 'Starred', icon: 'Star' },
  { id: 'archive', label: 'Archive', icon: 'Archive' },
  { id: 'spam', label: 'Spam', icon: 'Warning' },
  { id: 'trash', label: 'Trash', icon: 'Trash' },
] as const;

export type FolderId = (typeof FOLDERS)[number]['id'];

// Pagination
export const EMAILS_PER_PAGE = 50;

// Max attachment size in bytes (25MB like Gmail)
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// Supported attachment types
export const SUPPORTED_ATTACHMENT_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'application/vnd.ms-excel',
  'text/*',
  'application/zip',
  'application/x-rar-compressed',
  'video/*',
  'audio/*',
];
