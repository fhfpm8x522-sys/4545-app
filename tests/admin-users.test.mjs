import test from 'node:test';import assert from 'node:assert/strict';
import {parseAction,auditDetails} from '../supabase/functions/admin-users/actions.mjs';
const userId='12345678-1234-1234-1234-123456789abc';
test('critical user changes require explicit confirmation and a valid target',()=>{
 assert.throws(()=>parseAction({action:'verify',userId}),/CONFIRMATION/);
 assert.throws(()=>parseAction({action:'verify',userId:'other',confirmed:true}),/INVALID_USER/);
 assert.throws(()=>parseAction({action:'delete',userId,confirmed:true}),/INVALID_ACTION/);
});
test('passwords stay out of audit data and extra request fields are discarded',()=>{
 const input=parseAction({action:'password',userId,confirmed:true,password:'private-test-password',role:'owner'});
 assert.equal(input.role,undefined);assert.equal(auditDetails(input,'requested').password,undefined);
 assert.throws(()=>parseAction({action:'password',userId,confirmed:true,password:'short'}),/PASSWORD_LENGTH/);
});
test('directory pagination remains bounded',()=>{assert.equal(parseAction({action:'list',page:-5}).page,1);assert.equal(parseAction({action:'list',page:Infinity}).page,10000);});
