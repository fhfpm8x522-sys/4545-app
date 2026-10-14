import test from 'node:test';import assert from 'node:assert/strict';import {per90,birthdayLabel} from '../src/lib/player-model.mjs';
test('per-90 keeps known zero goals and never divides missing or zero minutes',()=>{assert.equal(per90(0,90),0);assert.equal(per90(2,180),1);assert.equal(per90(2,0),null);assert.equal(per90(null,180),null);assert.equal(per90(1,-90),null);});
test('birthdays preserve the calendar date and reject impossible dates',()=>{assert.ok(birthdayLabel('2000-02-29'));assert.equal(birthdayLabel('2001-02-29'),null);assert.equal(birthdayLabel('unknown'),null);});
