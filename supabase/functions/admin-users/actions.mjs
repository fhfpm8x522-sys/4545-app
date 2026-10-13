export function parseAction(body) {
  const action=body?.action;
  if(action==='list')return {action,page:Math.max(1,Math.min(10000,Math.floor(Number(body.page)||1)))};
  if(!['password','verify','club'].includes(action))throw Error('INVALID_ACTION');
  if(!/^[a-f0-9-]{36}$/i.test(body.userId??''))throw Error('INVALID_USER');
  if(body.confirmed!==true)throw Error('CONFIRMATION_REQUIRED');
  if(action==='password'){
    if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw Error('PASSWORD_LENGTH');
    return {action,userId:body.userId,password:body.password};
  }
  if(action==='club'){
    if(!/^[a-f0-9-]{36}$/i.test(body.clubId??''))throw Error('INVALID_CLUB');
    return {action,userId:body.userId,clubId:body.clubId};
  }
  return {action,userId:body.userId};
}
export function auditDetails(input,status){return {action:input.action,status,...(input.action==='club'?{club_id:input.clubId}:{})};}
