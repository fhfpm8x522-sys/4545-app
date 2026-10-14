export const championshipSource='https://www.football.org.il/files/'+encodeURIComponent('תקנון האליפות - אוגוסט 2026.pdf');
export function competitionRules(name){
 const n=String(name??'');
 if(/ליגת העל|israel.*premier|ligat.?ha.?al/i.test(n))return {kind:'israel-premier',title:'שיטת ליגת העל · תקנון אוגוסט 2026',source:championshipSource,summary:'14 קבוצות משחקות שני סיבובים. מקומות 1–6 עוברים לפלייאוף עליון של שני סיבובים; מקומות 7–14 לפלייאוף תחתון של סיבוב אחד. המובילה בתום העליון היא האלופה; מקומות 13–14 בתום התחתון יורדים.',ties:'בשוויון נקודות: הפרש שערים, מספר ניצחונות, שערי זכות ולאחר מכן אותם מדדים במפגשים בין הקבוצות. הכרעה סופית שנותרת שווה כפופה לסעיף 50 בתקנון.',europe:'ההעפלה לאירופה תלויה ברשימת הגישה של אופ״א לעונה הבאה, במחזיקת הגביע וברישוי. מיקום זמני אינו אישור העפלה.'};
 return null;
}
export function standingZone(rule,position,scope='overall'){
 if(rule?.kind!=='israel-premier'||scope!=='overall'||!Number.isInteger(position))return null;
 if(position===1)return {key:'title',label:'מובילת מאבק האליפות',tone:'text-amber-400'};
 if(position===6)return {key:'playoff',label:'קו הפלייאוף העליון',tone:'text-blue-400'};
 if(position>=13&&position<=14)return {key:'relegation',label:'אזור ירידה זמני',tone:'text-red-400'};
 return null;
}
export function compareSeasonPoints(current,previous){if(!current||!previous||current.points===null||previous.points===null||!current.played||!previous.played)return null;return {current:current.points,previous:previous.points,currentPlayed:current.played,previousPlayed:previous.played,currentPerGame:current.points/current.played,previousPerGame:previous.points/previous.played};}
