// Run with: npx tsx lib/utils.test.ts
import assert from 'node:assert/strict';
import { htmlToText, insertSignature } from './utils';

// Block tags become line breaks, inline tags just vanish.
assert.equal(
  htmlToText('<p>Hi <b>there</b>,</p><p>See you<br>soon.</p>'),
  'Hi there,\nSee you\nsoon.'
);

// Entities decode, and &amp; last so an escaped entity stays escaped.
assert.equal(htmlToText('<p>Tom &amp; Jerry &quot;&nbsp;&#39;</p>'), 'Tom & Jerry " \'');
assert.equal(htmlToText('<p>&amp;lt;</p>'), '&lt;');

// Style/script contents never leak into the text part.
assert.equal(htmlToText('<style>p{color:red}</style><p>Body</p>'), 'Body');

// A body with no text at all must not produce an empty part silently passing.
assert.equal(htmlToText('<div><br></div>'), '');

console.log('✓ utils ok');

// --- insertSignature ---

const SIG = '<p>— Ada</p>';
const quote = '<br/><br/><div data-zenmail-quote style="x"><p>You wrote:</p></div>';

// New message: signature goes at the end.
assert.equal(
  insertSignature('<p>Hello</p>', SIG),
  `<p>Hello</p><br/><div data-zenmail-signature>${SIG}</div>`
);

// Reply: signature lands above the quote, never below it.
const replied = insertSignature(quote, SIG);
assert.ok(replied.indexOf('data-zenmail-signature') < replied.indexOf('data-zenmail-quote'));
assert.ok(replied.endsWith('</div>') && replied.includes('You wrote:'));

// Idempotent — autosave re-runs must not stack a second copy.
assert.equal(insertSignature(replied, SIG), replied);

// No signature configured: body untouched.
assert.equal(insertSignature('<p>Hello</p>', ''), '<p>Hello</p>');

console.log('utils tests passed');
