export const GUESS_RULES = {
  lineup: { label: 'מי יפתח בהרכב?', points: 22 },
  first_team: { label: 'מי תכבוש ראשונה?', points: 15 },
  first_scorer: { label: 'מי יכבוש ראשון?', points: 20 },
  halftime: { label: 'מי תוביל במחצית?', points: 15 },
  goals: { label: 'מעל או מתחת ל־2.5 שערים?', points: 10 },
  yellows: { label: 'מעל או מתחת ל־5.5 צהובים?', points: 10 },
  winner: { label: 'מי תנצח במשחק?', points: 10 },
  exact_score: { label: 'מה תהיה התוצאה?', points: 25 },
};
function integer(...values) { for (const v of values) { if (v === null || v === undefined || v === '') continue; const n=Number(v); if(Number.isInteger(n)&&n>=0)return n; } return null; }
const result=(h,a)=>h>a?'home':h<a?'away':'draw';
export function deriveGuessFacts(match, fixture, lineups, players) {
  const facts={}; const f=fixture?.data??fixture; const l=lineups?.lineups??lineups?.data??lineups;
  const byId=new Map(); for(const p of players) for(const id of [p.goal_player_id,p.goal_api_id])if(id)byId.set(String(id),p.id);
  for(const side of ['home','away']) {
    const rows=l?.[side]?.startingLineups??l?.[side]?.starting_lineups;
    if(Array.isArray(rows)&&rows.length===11){const ids=rows.map(p=>byId.get(String(p.playerKey))??byId.get(String(p.playerId)));if(ids.every(Boolean)&&new Set(ids).size===11)facts['lineup_'+side]=ids;}
  }
  if(match.status==='cancelled')return {...facts,void:true};
  if(match.status!=='finished'||!f||!['FINISHED','FT','AFTER EXTRA TIME','AET'].includes(String(f.matchStatus??f.status).toUpperCase()))return facts;
  // All score questions concern regulation time, including its added time.
  const extra=f.homeTeamExtraScore!=null||f.awayTeamExtraScore!=null;
  const h=integer(f.homeTeamFtScore,...(extra?[]:[f.homeTeamScore,f.homeScore]));
  const a=integer(f.awayTeamFtScore,...(extra?[]:[f.awayTeamScore,f.awayScore]));
  if(h!==null&&a!==null){facts.exact_score={home:h,away:a};facts.winner=result(h,a);facts.goals=h+a>2.5?'over':'under';}
  const hh=integer(f.homeTeamHalftimeScore),ha=integer(f.awayTeamHalftimeScore);
  if(hh!==null&&ha!==null)facts.halftime=result(hh,ha);
  if(Array.isArray(f.cards)&&f.cards.every(c=>/yellow|red/i.test(c.card??c.type??c.cardType??'')))facts.yellows=f.cards.filter(c=>/yellow/i.test(c.card??c.type??c.cardType??'')&&!/extra|shootout/i.test(c.scoreInfoTime??c.period??'')).length>5.5?'over':'under';
  if(h===0&&a===0){facts.first_team='none';facts.first_scorer='none';return facts;}
  if(h===null||a===null||!Array.isArray(f.events))return facts;
  const goals=f.events.filter(e=>/goal/i.test(e.type??'')&&!/extra|shootout/i.test(e.scoreInfoTime??e.period??''));
  // A partial event feed must never decide first scorer or first scoring team.
  if(goals.length!==h+a)return facts;
  const first=goals.find(e=>/^\s*(1\s*[-:]\s*0|0\s*[-:]\s*1)\s*$/.test(e.score??''));
  if(!first)return facts;
  const score=String(first.score).split(/[-:]/).map(Number);const side=score[0]===1?'home':'away';
  // Cumulative scores establish order independently of provider array order.
  const ordered=goals.map(event=>({event,score:String(event.score??'').split(/[-:]/).map(Number)}));
  if(ordered.some(g=>g.score.length!==2||g.score.some(n=>!Number.isInteger(n)||n<0)))return facts;
  ordered.sort((x,y)=>x.score[0]+x.score[1]-y.score[0]-y.score[1]);
  let previous=[0,0];let scorer=null;
  for(let i=0;i<ordered.length;i++){
    const g=ordered[i];const delta=g.score.map((n,j)=>n-previous[j]);
    if(g.score[0]+g.score[1]!==i+1||!((delta[0]===1&&delta[1]===0)||(delta[0]===0&&delta[1]===1)))return facts;
    if(!scorer&&!/own/i.test([g.event.type,g.event.info].join(' ')))scorer={event:g.event,side:delta[0]===1?'home':'away'};
    previous=g.score;
  }
  if(previous[0]!==h||previous[1]!==a)return facts;
  facts.first_team=side;
  if(!scorer){facts.first_scorer='none';return facts;}
  const pid=scorer.event[scorer.side+'ScorerId']??scorer.event.scorerId??scorer.event.playerId;const resolved=byId.get(String(pid));if(resolved)facts.first_scorer=resolved;
  return facts;
}
export function gradeGuess(kind,choice,facts) {
  if(facts.void)return 0;
  if(kind==='lineup'){const actual=facts['lineup_'+choice.side];if(!actual)return null;return choice.players.filter(id=>actual.includes(id)).length*2;}
  if(!Object.hasOwn(facts,kind))return null;
  if(kind==='exact_score')return choice.home===facts.exact_score.home&&choice.away===facts.exact_score.away?25:0;
  return choice.value===facts[kind]?GUESS_RULES[kind].points:0;
}
