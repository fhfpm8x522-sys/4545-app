import { strict as assert } from "node:assert";
import { n, status, fixtureScore, preserveKnown, uniqueEvents, collectFixtures, substitutionPlayers } from "./normalize.ts";
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


assert.deepEqual(substitutionPlayers({substitution:"A. C. Ganah | Y. Malede",substitutionPlayerId:"943993883 | 2170548856"}),{outName:"A. C. Ganah",inName:"Y. Malede",outId:"943993883",inId:"2170548856"});
assert.deepEqual(substitutionPlayers({playerOut:"Out",playerIn:"In",playerOutId:"1",playerInId:"2"}),{outName:"Out",inName:"In",outId:"1",inId:"2"});
console.log("21 sync normalization, pagination and substitution checks passed");

// Run the real request handler with a read-only database and provider doubles.
const {readFile} = await import("node:fs/promises");
const {stripTypeScriptTypes} = await import("node:module");
const {runInNewContext} = await import("node:vm");
const normalizerCode = (await readFile(new URL("./normalize.ts",import.meta.url),"utf8")).replace(/^export /gm, "");
const handlerCode = (await readFile(new URL("./index.ts",import.meta.url),"utf8")).replace(/^import .*;\r?\n/gm, "").replace("type J = Record<string, any>;", "");
let handler: any;
let reads = 0;
let requests = 0;
const readOnlyDb = {from(table: string) {
 assert.equal(table,"clubs"); reads++;
 const query: any = {select(){return query;},eq(){return query;},not(){return Promise.resolve({data:[{id:"club",goal_team_id:"team",active:true}],error:null});}};
 return query;
}};
runInNewContext(stripTypeScriptTypes(normalizerCode+"\n"+handlerCode), {
 createClient:()=>readOnlyDb, Request,Response,AbortSignal,console,
 Deno:{env:{get:(key: string)=>({SUPABASE_URL:"https://example.invalid",SUPABASE_SERVICE_ROLE_KEY:"test-service",GOAL_API_KEY:"test-provider"}[key])},serve:(fn: any)=>{handler=fn;}},
 fetch:async(url: string)=>{requests++; assert.ok(url.endsWith("?limit=50&offset=0")); return Response.json({data:[{id:"fixture",leagueYear:"2026/2027",kickoffUtc:"2026-10-10T16:00:00Z",matchStatus:"FINISHED",homeTeamScore:"0",awayTeamScore:"2"}],pagination:{total:1,hasMore:false}});}
});
assert.equal((await handler(new Request("https://example.invalid",{method:"GET"}))).status,405);
assert.equal((await handler(new Request("https://example.invalid",{method:"POST"}))).status,401);
assert.equal(reads,0);
assert.equal(requests,0);
const authenticatedRequest = (body: any)=>new Request("https://example.invalid",{method:"POST",headers:{Authorization:"Bearer test-service"},body:JSON.stringify(body)});
assert.equal((await handler(authenticatedRequest({phase:"invalid"}))).status,400);
const previewResponse=await handler(authenticatedRequest({preview:true,phase:"fixtures"}));
assert.equal(previewResponse.status,200);
const previewBody=await previewResponse.json();
assert.deepEqual(previewBody.fixtures,[{id:"fixture",kickoff:"2026-10-10T16:00:00.000Z",status:"finished",home:0,away:2}]);
assert.equal(reads,1);
assert.equal(requests,1);
console.log("9 request authorization and read-only preview checks passed");

assert.equal((await handler(new Request("https://example.invalid",{method:"POST",headers:{Authorization:"Bearer test-service"},body:"invalid-json"}))).status,400);
assert.equal((await handler(authenticatedRequest({preview:"true"}))).status,400);
console.log("2 malformed request safety checks passed");
