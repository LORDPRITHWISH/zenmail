// Run with: npx tsx lib/rules.test.ts
import assert from 'node:assert/strict';
import { routeWithRules, InboundEmail } from './rules';
import type { IRule } from '../models/Rule';

const rule = (r: Partial<IRule>) => r as IRule;

const mail: InboundEmail = {
  from: 'Newsletter <news@shop.example>',
  to: ['me@zenux.live'],
  subject: '50% OFF everything (ends today)',
  text: 'unsubscribe at the bottom',
};

// No rules → straight to inbox, untouched.
assert.deepEqual(routeWithRules(mail, []), {
  folder: 'inbox',
  labels: [],
  isStarred: false,
});

// Substring match on sender routes to a folder.
assert.equal(
  routeWithRules(mail, [rule({ field: 'from', contains: 'shop.example', action: 'archive' })])
    .folder,
  'archive'
);

// Matching is case-insensitive and trims the needle.
assert.equal(
  routeWithRules(mail, [rule({ field: 'subject', contains: '  off  ', action: 'spam' })]).folder,
  'spam'
);

// Non-match leaves routing alone.
assert.equal(
  routeWithRules(mail, [rule({ field: 'subject', contains: 'invoice', action: 'spam' })]).folder,
  'inbox'
);

// Regex metacharacters are literal, not patterns — "(ends" matches, ".*" doesn't.
assert.equal(
  routeWithRules(mail, [rule({ field: 'subject', contains: '(ends', action: 'star' })]).isStarred,
  true
);
assert.equal(
  routeWithRules(mail, [rule({ field: 'subject', contains: '.*', action: 'spam' })]).folder,
  'inbox'
);

// Labels accumulate and de-duplicate; last folder rule wins.
const many = routeWithRules(mail, [
  rule({ field: 'from', contains: 'news', action: 'label', labelId: 'L1' }),
  rule({ field: 'body', contains: 'unsubscribe', action: 'label', labelId: 'L1' }),
  rule({ field: 'body', contains: 'unsubscribe', action: 'label', labelId: 'L2' }),
  rule({ field: 'to', contains: 'me@zenux.live', action: 'archive' }),
  rule({ field: 'subject', contains: 'off', action: 'spam' }),
]);
assert.deepEqual(many.labels, ['L1', 'L2']);
assert.equal(many.folder, 'spam');

// An empty needle is ignored rather than matching everything.
assert.equal(
  routeWithRules(mail, [rule({ field: 'subject', contains: '   ', action: 'trash' })]).folder,
  'inbox'
);

console.log('✓ rules ok');
