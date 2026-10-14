export function publicMatchSnapshot(match:any,events?:any[],savedAt?:string):any;
export function publicClubSnapshot(club:any,competitions?:any[],savedAt?:string):any;
export function savePublicSnapshot(snapshot:any,storage:Storage|undefined):void;
export function readPublicSnapshots(storage:Storage|undefined):any[];
export function getPublicStorage():Storage|undefined;
