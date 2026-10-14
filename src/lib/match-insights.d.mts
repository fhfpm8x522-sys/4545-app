export function eventKind(event:any):{category:string;label:string;icon:string};
export function eventClock(event:any):{label:string;added:number|null;total:number};
export function averageRatings(value:any):Array<{side:string;players:any[];average:number|null;rated:number}>;
export function statsPeriods(value:any):Array<{key:string;label:string;rows:Array<{label:string;home:number|null;away:number|null}>}>;
export function headToHead(match:any,rows:any[]):any[];
