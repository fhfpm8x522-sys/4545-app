import { finiteNumber, matchStats, lineupsSides } from './football-model.mjs';
export function eventKind(event) {
 const raw=String(event.raw_type??event.event_type??'').toLowerCase().replace(/[ _-]/g,'');
 if(raw.includes('var')||raw.includes('cancel')||raw.includes('disallow'))return {category:'var',label:raw.includes('cancel')||raw.includes('disallow')?'VAR — שער בוטל':'בדיקת VAR',icon:'📺'};
 if(raw.includes('penalty')&&raw.includes('miss'))return {category:'other',label:'פנדל הוחמץ',icon:'✕'};
 if(raw.includes('owngoal'))return {category:'goal',label:'שער עצמי',icon:'⚽'};
 if(raw.includes('penalty')&&!raw.includes('miss'))return {category:'goal',label:'שער בפנדל',icon:'⚽'};
 const type=String(event.event_type??'').toLowerCase();
 if(type.includes('goal'))return {category:'goal',label:'שער',icon:'⚽'};
 if(type.includes('yellow'))return {category:'card',label:'כרטיס צהוב',icon:'🟨'};
 if(type.includes('red'))return {category:'card',label:'כרטיס אדום',icon:'🟥'};
 if(type.includes('sub'))return {category:'sub',label:'חילוף',icon:'🔁'};
 return {category:'other',label:raw.includes('penaltymiss')?'פנדל הוחמץ':'אירוע',icon:'•'};
}
export function eventClock(event) {
 const text=String(event.minute_display??event.time??'');const explicit=text.match(/^(\d+)\s*\+\s*(\d+)$/);
 const base=finiteNumber(event.minute_base),added=finiteNumber(event.added_minute);
 if(explicit)return {label:explicit[1]+'+'+explicit[2],added:Number(explicit[2]),total:Number(explicit[1])+Number(explicit[2])};
 if(base!==null&&added!==null&&base>=0&&added>=0)return {label:added?base+'+'+added:String(base),added,total:base+added};
 const total=finiteNumber(event.minute);return {label:total===null?'—':String(total),added:null,total:total??-1};
}
export function averageRatings(lineups) {return lineupsSides(lineups).map(side=>{const ratings=side.players.map(p=>finiteNumber(p.rating,p.playerRating,p.lineupRating)).filter(n=>n!==null&&n>0&&n<=10);return {...side,average:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,rated:ratings.length};});}
export function statsPeriods(raw) {const root=raw?.match??raw??{};return [['full','כל המשחק',root.fullTime??raw],['first','מחצית ראשונה',root.firstHalf],['second','מחצית שנייה',root.secondHalf]].map(([key,label,value])=>({key,label,rows:value?matchStats(value):[]}));}
export function headToHead(match,rows) {return rows.filter(r=>r.id!==match.id&&r.status==='finished'&&typeof r.home_score==='number'&&typeof r.away_score==='number'&&Date.parse(r.kickoff)<Date.parse(match.kickoff)&&((r.home_club_id===match.home_club_id&&r.away_club_id===match.away_club_id)||(r.home_club_id===match.away_club_id&&r.away_club_id===match.home_club_id))).sort((a,b)=>Date.parse(b.kickoff)-Date.parse(a.kickoff));}
