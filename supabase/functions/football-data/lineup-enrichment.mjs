import {transliterateName} from '../../../src/lib/name-hebrew.mjs';
export function enrichLineupNames(value,players,match){
 if(Array.isArray(value))return value.map(v=>enrichLineupNames(v,players,match));
 if(!value||typeof value!=='object')return value;
 let result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,enrichLineupNames(v,players,match)]));
 if(value.lineupPlayer||value.playerName){const side=String(value.team??value.teamSide??value.side??'').toLowerCase(),club=side==='home'?match.home_club_id:side==='away'?match.away_club_id:null;
  const candidates=players.filter(p=>(!club||p.club_id===club)&&((p.goal_player_id&&String(p.goal_player_id)===String(value.playerId))||(p.goal_api_id&&String(p.goal_api_id)===String(value.playerKey??value.apiId))));
  const player=candidates.find(p=>p.name_he_verified)||candidates[0];
  result={...result,name_he:player?.name_he||transliterateName(value.lineupPlayer??value.playerName),name_he_verified:player?.name_he_verified??false,name_original:value.lineupPlayer??value.playerName,player_ref_id:player?.id??null,playerImage:player?.image_url||value.playerImage,image_credit:player?.image_credit??null,image_source_url:player?.image_source_url??null,image_license_url:player?.image_license_url??null};
 }
 return result;
}
