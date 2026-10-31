export const NORMAL_DOOR_WIDTH=4;
export const MAX_IMPORTED_DOOR_WIDTH=8;
export type OpeningEvidence='door-symbol'|'window-symbol'|'open-gap'|'solid-wall'|'unclear';
export function recognizedOpening(kind:'door'|'window'|'passage',width:number,evidence:OpeningEvidence){
 if(evidence==='solid-wall')return null;
 if(kind==='window')return evidence==='window-symbol'||evidence==='unclear'?'window':null;
 if(kind==='door'&&evidence==='door-symbol'&&width<=MAX_IMPORTED_DOOR_WIDTH)return 'door';
 if(evidence==='open-gap'||evidence==='door-symbol'&&width>MAX_IMPORTED_DOOR_WIDTH)return 'passage';
 return null;
}
