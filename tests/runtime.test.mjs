import test from 'node:test';
import assert from 'node:assert/strict';
import {appRedirectUrl, assertResults, nextMatch, pickWidgetSlot, publicClientKey, oneRelation} from '../src/lib/runtime-utils.mjs';
test('Supabase joined records accept object and array response shapes', () => {
  const record={status:'finished'};
  assert.equal(oneRelation(record),record);
  assert.equal(oneRelation([record]),record);
  assert.equal(oneRelation([]),null);
});
test('Pages auth redirects preserve the repository base path', () => {
  assert.equal(appRedirectUrl('https://example.github.io', '/4545-app/', 'reset-password'), 'https://example.github.io/4545-app/reset-password');
  assert.equal(appRedirectUrl('https://preview.example', '/', ''), 'https://preview.example/');
});
test('partial Supabase errors cannot masquerade as empty data', () => {
  assert.throws(() => assertResults({data:[]}, {error:new Error('permission denied')}), /permission denied/);
});
test('a live match wins over an old scheduled fixture', () => {
  const fixtures=[{status:'scheduled',kickoff:'2026-01-01',id:'old'}, {status:'scheduled',kickoff:'2026-11-01',id:'next'}, {status:'live',kickoff:'2026-10-14',id:'live'}];
  assert.equal(nextMatch(fixtures, Date.parse('2026-10-14')).id, 'live');
  assert.equal(nextMatch(fixtures.slice(0,2), Date.parse('2026-10-14')).id, 'next');
});
test('widget overrides only apply on their configured day', () => {
  const slots=[{override_date:'2026-10-15',id:'tomorrow'}, {override_date:null,id:'normal'}, {override_date:'2026-10-14',id:'today'}];
  assert.equal(pickWidgetSlot(slots,'2026-10-14').id,'today');
  assert.equal(pickWidgetSlot(slots,'2026-10-16').id,'normal');
});
test('server keys are rejected before creating a browser client', () => {
  const jwt=role => 'eyJ.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
  assert.throws(()=>publicClientKey('sb_secret_example'));
  assert.throws(()=>publicClientKey(jwt('service_role')));
  assert.equal(publicClientKey(jwt('anon')),jwt('anon'));
  assert.equal(publicClientKey('sb_publishable_example'),'sb_publishable_example');
});
