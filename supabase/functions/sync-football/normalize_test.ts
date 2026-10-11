import { strict as assert } from "node:assert";
import { n, status, fixtureScore, preserveKnown, uniqueEvents, collectFixtures } from "./normalize.ts";
assert.equal(n(false), null);
assert.equal(n(""), null);
assert.equal(n("0"), 0);
assert.equal(status("FT", true), "finished");
assert.equal(status("cancelled", true), "cancelled");
assert.deepEqual(fixtureScore({homeScore:false,score:"2 - 1"}), {home:2,away:1});
assert.equal(preserveKnown({home_score:2},{home_score:null}).home_score, 2);
assert.equal(preserveKnown({image_url:"saved"},{image_url:null}).image_url, "saved");
assert.equal(preserveKnown({club_id:"old"},{club_id:null}).club_id, null);
assert.equal(uniqueEvents([{goal_event_id:"a"},{goal_event_id:"a"}]).length, 1);


assert.deepEqual(fixtureScore({homeTeamScore:"0",awayTeamScore:"2"}), {home:0,away:2});
assert.deepEqual(fixtureScore({homeTeamScore:"5",homeTeamFtScore:"3",awayTeamScore:"2"}), {home:5,away:2});
assert.equal(status("AFTER_ET", "0"), "finished");
assert.equal(status("AFTER_PEN", "0"), "finished");
const offsets: number[] = [];
const fixtures = await collectFixtures(async (offset, limit) => {
 offsets.push(offset);
 const count = Math.min(limit, 123-offset);
 return {data:Array.from({length:count}, (_,i)=>({id:String(offset+i)})),pagination:{total:123,hasMore:offset+count<123}};
});
assert.deepEqual(offsets,[0,50,100]);
assert.equal(fixtures.length,123);
assert.equal((await collectFixtures(async()=>({data:[],pagination:{total:0,hasMore:false}}))).length,0);
await assert.rejects(collectFixtures(async()=>({data:[{id:"repeated"}],pagination:{hasMore:true}})),/did not advance/);
await assert.rejects(collectFixtures(async()=>({data:[{}],pagination:{hasMore:false}})),/missing its provider ID/);
console.log("19 sync normalization and pagination checks passed");
