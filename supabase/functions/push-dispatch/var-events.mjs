export function varEvents(raw,fixtureId){
 const rows=Array.isArray(raw)?raw:['var','varEvents','reviews','events'].flatMap(k=>Array.isArray(raw?.[k])?raw[k]:[]);
 return rows.filter(e=>e&&typeof e==='object'&&/(?:^|[^a-z])var(?:[^a-z]|$)|video.?assistant|video.?review/i.test([e.eventType,e.type,e.raw_type,e.detail,e.description,e.text,e.goalType].filter(Boolean).join(' '))).map(e=>{
  const clock=String(e.minute??e.time??''),m=clock.match(/^(\d{1,3})(?:\+(\d{1,2}))?(?::\d{2})?$/),base=m?Number(m[1]):null,added=m?.[2]?Number(m[2]):null;
  const minute=base===null?null:base+(added??0);const detail=String(e.detail??e.description??e.text??e.decision??e.goalType??e.eventType??e.type??'VAR').slice(0,300);
  const side=String(e.teamSide??e.side??e.team??'').toLowerCase();
  const providerId=e.eventId??e.id??null;
  return {event_type:'var',raw_type:String(e.eventType??e.type??'VAR').slice(0,100),minute,source_clock:m?clock:null,minute_base:added===null?null:base,added_minute:added,team_side:['home','away'].includes(side)?side:null,detail,goal_event_id:JSON.stringify(['var',fixtureId,providerId??[clock,side,detail]])};
 });
}
export function mergedVarEvents(events,commentary,fixtureId){
 const primary=varEvents(events,fixtureId),secondary=varEvents(commentary,fixtureId);
 const signature=e=>JSON.stringify([e.minute,e.team_side,String(e.detail).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()]);
 return [...primary,...secondary.filter(e=>!primary.some(p=>p.goal_event_id===e.goal_event_id||(e.minute!==null&&signature(p)===signature(e))))];
}
