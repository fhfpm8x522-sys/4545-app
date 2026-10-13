import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailConfirmation } from '../src/lib/email-confirmation.mjs';

test('confirmation supports private fragments and query fallback with no external redirect', () => {
  const token = 'a'.repeat(64);
  assert.deepEqual(parseEmailConfirmation('', `#token_hash=${token}&type=email&next=https://evil.example`), { token_hash: token, type: 'email' });
  assert.deepEqual(parseEmailConfirmation(`?token_hash=${token}&type=recovery`, ''), { token_hash: token, type: 'recovery' });
});
test('missing, malformed and unsupported verification flows are rejected', () => {
  for (const query of ['', '?type=email', '?token_hash=short&type=email', `?token_hash=${'a'.repeat(64)}&type=invite`, '?token_hash=%3Cscript%3E&type=email']) assert.equal(parseEmailConfirmation(query, ''), null);
});
