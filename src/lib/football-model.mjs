export function providerRows(value) {
  if(Array.isArray(value)) return value;
  for(const key of ['data','standings','table','rows','items','results','statistics','news','commentary']) {
    if(value?.[key]) {const rows=providerRows(value[key]);if(rows.length)return rows;}
  }
  if(Array.isArray(value?.groups)) return value.groups.flatMap(group=>providerRows(group).map(row=>({...row,group:group.name??group.group})));
  return [];
}
export function finiteNumber(...values) {
  for(const value of values){if(value===null||value===undefined||value==='')continue;const n=Number(String(value).replace('%',''));if(Number.isFinite(n))return n;}
  return null;
}
export function standingsRows(raw) {
  const rows=providerRows(raw);
  // Some providers mix an old play-off table with the current league stage.
  const current=rows.filter(row=>String(row.stageName??'').toLowerCase()==='current');
  return (current.length?current:rows).map(row=>({
    position:finiteNumber(row.position,row.rank,row.overallLeaguePosition,row.overall_league_position,row.standing_place),
    teamId:String(row.teamId??row.team?.id??row.team_id??''),
    name:row.teamName??row.team?.name??row.team_name??row.name??'קבוצה',
    played:finiteNumber(row.played,row.matchesPlayed,row.overallLeaguePlayed,row.overallLeaguePayed,row.overall_league_payed),
    wins:finiteNumber(row.wins,row.won,row.overallLeagueW,row.overall_league_W),
    draws:finiteNumber(row.draws,row.drawn,row.overallLeagueD,row.overall_league_D),
    losses:finiteNumber(row.losses,row.lost,row.overallLeagueL,row.overall_league_L),
    gf:finiteNumber(row.goalsFor,row.goals_for,row.overallLeagueGF,row.overall_league_GF),
    ga:finiteNumber(row.goalsAgainst,row.goals_against,row.overallLeagueGA,row.overall_league_GA),
    points:finiteNumber(row.points,row.overallLeaguePTS,row.overall_league_PTS),group:row.group??row.stageName??null,
  })).sort((a,b)=>(a.position??999)-(b.position??999));
}
export function formationBands(formation,players) {
  const sorted=[...players].sort((a,b)=>Number(a.lineupPosition??a.position??999)-Number(b.lineupPosition??b.position??999));
  const digits=String(formation??'').split('-').map(Number);
  if(sorted.length===11&&digits.every(n=>Number.isInteger(n)&&n>0)&&digits.reduce((a,b)=>a+b,0)===10){
    let offset=1;return [[sorted[0]],...digits.map(n=>{const band=sorted.slice(offset,offset+n);offset+=n;return band;})];
  }
  return [sorted];
}
export function lineupsSides(raw) {
  const root=raw?.lineups??raw??{};
  return ['home','away'].map(side=>{
    const v=root[side]??root[`${side}Team`]??{};
    const starters=v.startingLineups??v.starting_lineups??v.starting??root[`${side}StartingLineups`]??[];
    const all=root.startingLineups;
    const players=Array.isArray(starters)&&starters.length?starters:Array.isArray(all)?all.filter(p=>String(p.teamSide??p.side??'').toLowerCase()===side):[];
    return {side,formation:v.formation??root[`${side}Formation`]??null,players,substitutes:v.substitutes??v.bench??[]};
  });
}
export function matchStats(raw) {
  const rows=raw?.match?.fullTime??raw?.fullTime??providerRows(raw);
  return rows.map(row=>({label:row.type??row.name??row.label??'',home:finiteNumber(row.home,row.homeValue),away:finiteNumber(row.away,row.awayValue)})).filter(row=>row.label&&row.home!==null&&row.away!==null);
}
export function safeSourceUrl(value) {try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
