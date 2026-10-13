import test from 'node:test';import assert from 'node:assert/strict';
import {formationBands,standingsRows,lineupsSides,matchStats,safeSourceUrl} from '../src/lib/football-model.mjs';
test('tables normalize provider field names and rank numerically',()=>{
 const rows=standingsRows({standings:[{overall_league_position:'10',team_name:'B',overall_league_PTS:'5'},{position:'2',teamName:'A',points:20}]});
 assert.equal(rows[0].name,'A');assert.equal(rows[1].points,5);assert.equal(rows[1].wins,null);
});
test('current league table takes precedence over an old championship group',()=>{
 const rows=standingsRows([{teamId:'team',stageName:'Championship Group',overallLeaguePosition:'1',overallLeaguePlayed:'36'}, {teamId:'team',stageName:'Current',overallLeaguePosition:'4',overallLeaguePlayed:'6'}]);
 assert.equal(rows.length,1);assert.equal(rows[0].position,4);assert.equal(rows[0].played,6);
});
test('valid formation consumes exactly eleven players and sorts positions as numbers',()=>{
 const p=Array.from({length:11},(_,i)=>({lineupPosition:String(11-i)}));const bands=formationBands('4-2-3-1',p);assert.deepEqual(bands.map(b=>b.length),[1,4,2,3,1]);assert.equal(bands[0][0].lineupPosition,'1');assert.equal(formationBands('4-3-3',p.slice(0,5)).length,1);
});
test('lineups keep home and away players attached to their team',()=>{const rows=lineupsSides({home:{startingLineups:[{lineupPlayer:'H'}]},away:{startingLineups:[{lineupPlayer:'A'}]}});assert.equal(rows[0].players[0].lineupPlayer,'H');assert.equal(rows[1].players[0].lineupPlayer,'A');});
test('fixture statistics retain home and away direction',()=>{assert.deepEqual(matchStats({match:{fullTime:[{type:'Possession',home:'62%',away:'38%'}]}}),[{label:'Possession',home:62,away:38}]);});
test('external sources reject script URLs',()=>{assert.equal(safeSourceUrl('javascript:alert(1)'),null);assert.equal(safeSourceUrl('https://example.com/news'),'https://example.com/news');});
