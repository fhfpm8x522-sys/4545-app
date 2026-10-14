import test from 'node:test';import assert from 'node:assert/strict';import {varEvents} from '../supabase/functions/push-dispatch/var-events.mjs';
test('VAR clock and stable provider identity survive a corrected decision',()=>{const e={id:8,type:'VAR',minute:'90+3',detail:'Checking goal',side:'home'};const a=varEvents([e],'game')[0],b=varEvents([{...e,detail:'Goal cancelled'}],'game')[0];assert.equal(a.minute,93);assert.equal(a.added_minute,3);assert.equal(a.goal_event_id,b.goal_event_id);assert.notEqual(a.detail,b.detail);});
test('VAR does not invent a team or include unrelated events',()=>{assert.equal(varEvents([{type:'yellowcard',minute:7}],'a').length,0);const [e]=varEvents({varEvents:[{type:'VAR',minute:'?'}]},'b');assert.equal(e.minute,null);assert.equal(e.team_side,null);});
test('scorer feeds explicitly marking VAR carry the decision into the timeline',()=>{const [e]=varEvents([{homeScorer:'Player',goalType:'VAR Goal Cancelled',minute:22}],'m');assert.equal(e.detail,'VAR Goal Cancelled');assert.equal(e.event_type,'var');});
test('GOAL commentary text and underscore types are supported without matching player names containing var',()=>{const [e]=varEvents([{id:'comment',text:'VAR checking penalty',time:'91:33'}],'m');assert.equal(e.minute,91);assert.equal(e.source_clock,'91:33');assert.equal(e.detail,'VAR checking penalty');assert.equal(varEvents([{goalType:'VAR_GOAL_CANCELLED'}],'m').length,1);assert.equal(varEvents([{text:'Vargas scored a goal'}],'m').length,0);});
import {mergedVarEvents} from '../supabase/functions/push-dispatch/var-events.mjs';
test('duplicate VAR descriptions across feeds are merged but distinct decisions remain',()=>{
 const events=[{id:1,type:'VAR',minute:50,side:'home',detail:'Checking goal'}];
 const commentary=[{id:2,type:'VAR',time:'50',team:'home',text:'Checking goal!'}, {id:3,type:'VAR',time:'50',team:'home',text:'Goal cancelled'}];
 assert.equal(mergedVarEvents(events,commentary,'m').length,2);
 assert.equal(mergedVarEvents(events,[{id:4,type:'VAR',time:'?',text:'Checking goal'}],'m').length,2);
});
