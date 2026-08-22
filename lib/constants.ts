// Folder configuration
export const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: 'Tray' },
  { id: 'sent', label: 'Sent', icon: 'PaperPlaneTilt' },
  { id: 'drafts', label: 'Drafts', icon: 'PencilSimpleLine' },
  { id: 'scheduled', label: 'Scheduled', icon: 'ClockCountdown' },
  { id: 'starred', label: 'Starred', icon: 'Star' },
  { id: 'archive', label: 'Archive', icon: 'Archive' },
  { id: 'spam', label: 'Spam', icon: 'Warning' },
  { id: 'trash', label: 'Trash', icon: 'Trash' },
] as const;

export type FolderId = (typeof FOLDERS)[number]['id'];

// Pagination
export const EMAILS_PER_PAGE = 50;

// Max attachment size in bytes. Attachments live base64-encoded inside the
// Mongo document, which is capped at 16MB — base64 inflates by ~4/3, so the
// real ceiling is ~12MB of original bytes for the whole message.
// ponytail: inline base64 storage; move attachments to S3/R2 if users need >10MB.
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

// How long a sent email is held client-side so it can be un-sent.
export const UNDO_SEND_SECONDS = 5;

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

// Filter rules. Kept here rather than in the model so client components can
// import them without pulling mongoose into the browser bundle.
export const RULE_FIELDS = ['from', 'to', 'subject', 'body'] as const;
export const RULE_ACTIONS = ['label', 'archive', 'spam', 'star', 'trash'] as const;

export type RuleField = (typeof RULE_FIELDS)[number];
export type RuleAction = (typeof RULE_ACTIONS)[number];

// Escape user input before it goes into a Mongo $regex, so that a stray "(" is
// a literal paren instead of a syntax error, and ".*.*.*" can't pin the CPU.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
