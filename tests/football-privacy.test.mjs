import test from 'node:test';import assert from 'node:assert/strict';
import {publicFootballPayload} from '../supabase/functions/football-data/privacy.mjs';
test('public provider responses strip credentials while preserving identifiers and zero statistics',()=>{const result=publicFootballPayload({playerKey:'123',goal_api_id:'42',goals:0,nested:[{api_key:'credential',Authorization:'Bearer hidden',note:'contains private-test-key-123'}]},['private-test-key-123']);assert.deepEqual(result,{playerKey:'123',goal_api_id:'42',goals:0,nested:[{note:'contains [redacted]'}]});});
