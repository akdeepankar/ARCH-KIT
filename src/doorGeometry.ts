import {roomPoints} from './roomGeometry.ts';
import {wallPoint} from './model.ts';
import type {Room,Opening} from './model.ts';

export const DOOR_THICKNESS=.09;
const JAMB_CLEARANCE=.05;
const WALL_HALF_THICKNESS=.2;
// Shared plan/3D geometry: a single jamb pivot and an inward quarter-turn.
export function doorGeometry(room:Room,opening:Opening){
 const points=roomPoints(room),a=points[opening.side],b=points[(opening.side+1)%points.length];
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 const inward:[number,number]=[-dy/length,dx/length];
 const horizontal=dy===0,flipped=opening.swing===-1;
 const tangent:[number,number]=horizontal?[flipped?-1:1,0]:[0,flipped?-1:1];
 const start=wallPoint(room,opening.side,opening.offset+(flipped?opening.width-JAMB_CLEARANCE:JAMB_CLEARANCE));
 const hinge:[number,number]=[start[0]+inward[0]*(WALL_HALF_THICKNESS+.01),start[1]+inward[1]*(WALL_HALF_THICKNESS+.01)];
 const width=Math.max(.01,opening.width-2*JAMB_CLEARANCE);
 const tip:[number,number]=[hinge[0]+inward[0]*width,hinge[1]+inward[1]*width];
 const closedTip:[number,number]=[hinge[0]+tangent[0]*width,hinge[1]+tangent[1]*width];
 const sweep=tangent[0]*inward[1]-tangent[1]*inward[0]>0?1:0;
 return{hinge,tip,closedTip,width,inward,tangent,sweep,rotation:-Math.atan2(inward[1],inward[0])};
}
