export function providerRows(value: any): any[];
export function finiteNumber(...values: any[]): number | null;
export function standingsRows(raw: any, scope?: "overall"|"home"|"away"): Array<{position:number|null;teamId:string;name:string;played:number|null;wins:number|null;draws:number|null;losses:number|null;gf:number|null;ga:number|null;points:number|null;group:string|null}>;
export function formationBands(formation: string | null,players:any[]): any[][];
export function lineupsSides(raw:any): Array<{side:string;formation:string|null;players:any[];substitutes:any[]}>;
export function matchStats(raw:any): Array<{label:string;home:number|null;away:number|null}>;
export function safeSourceUrl(value: string | undefined | null): string | null;
