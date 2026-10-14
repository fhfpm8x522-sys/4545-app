export function recentForm(teamId:string,matches:any[]):Array<{id:string;result:string;points:number;ours:number;theirs:number}>;
export function scenarioPoints(rows:any[],matches:any[],choices:Record<string,string>,now?:number):any[];
export function leagueTeamTotals(matches:any[],clubId:string,season?:string):{wins:number;draws:number;losses:number;gf:number;ga:number;played:number}|null;
