import type { IRule } from '@/models/Rule';

export interface InboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface Routing {
  folder: string;
  labels: string[];
  isStarred: boolean;
}

function haystack(email: InboundEmail, field: IRule['field']): string {
  switch (field) {
    case 'from':
      return email.from;
    case 'to':
      return email.to.join(' ');
    case 'subject':
      return email.subject;
    case 'body':
      return email.text || email.html || '';
  }
}

/**
 * Fold a user's filters over one inbound email. Plain substring matching, case
 * insensitive — no regex, so a filter can't be turned into a DoS.
 * Later rules win on folder; labels accumulate.
 */
export function routeWithRules(email: InboundEmail, rules: IRule[]): Routing {
  const routing: Routing = { folder: 'inbox', labels: [], isStarred: false };

  for (const rule of rules) {
    const needle = rule.contains.trim().toLowerCase();
    if (!needle) continue;
    if (!haystack(email, rule.field).toLowerCase().includes(needle)) continue;

    switch (rule.action) {
      case 'archive':
        routing.folder = 'archive';
        break;
      case 'spam':
        routing.folder = 'spam';
        break;
      case 'trash':
        routing.folder = 'trash';
        break;
      case 'star':
        routing.isStarred = true;
        break;
      case 'label':
        if (rule.labelId && !routing.labels.includes(rule.labelId)) {
          routing.labels.push(rule.labelId);
        }
        break;
    }
  }

  return routing;
}
