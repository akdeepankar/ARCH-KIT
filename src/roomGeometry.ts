export const roomShapes=[{value:'rectangle',label:'Rectangle'},{value:'l',label:'L-shaped'},{value:'t',label:'T-shaped'},{value:'u',label:'U-shaped'},{value:'c',label:'C-shaped'},{value:'cross',label:'Cross-shaped'}] as const;
export type RoomShape=typeof roomShapes[number]['value'];
type Footprint={x:number;y:number;w:number;d:number;shape?:RoomShape};
type Point=[number,number];
type Cell=[number,number,number,number];
const third=1/3,twoThird=2/3;
const definitions:Record<RoomShape,{points:Point[];cells:Cell[]}>= {
 rectangle:{points:[[0,0],[1,0],[1,1],[0,1]],cells:[[0,0,1,1]]},
 l:{points:[[0,0],[1,0],[1,.5],[.5,.5],[.5,1],[0,1]],cells:[[0,0,1,.5],[0,.5,.5,.5]]},
 t:{points:[[0,0],[1,0],[1,third],[twoThird,third],[twoThird,1],[third,1],[third,third],[0,third]],cells:[[0,0,1,third],[third,third,third,twoThird]]},
 u:{points:[[0,0],[third,0],[third,twoThird],[twoThird,twoThird],[twoThird,0],[1,0],[1,1],[0,1]],cells:[[0,0,third,1],[twoThird,0,third,1],[third,twoThird,third,third]]},
 c:{points:[[0,0],[1,0],[1,third],[third,third],[third,twoThird],[1,twoThird],[1,1],[0,1]],cells:[[0,0,1,third],[0,third,third,third],[0,twoThird,1,third]]},
 cross:{points:[[third,0],[twoThird,0],[twoThird,third],[1,third],[1,twoThird],[twoThird,twoThird],[twoThird,1],[third,1],[third,twoThird],[0,twoThird],[0,third],[third,third]],cells:[[third,0,third,1],[0,third,third,third],[twoThird,third,third,third]]}
};
export function roomPoints(room:Footprint):Point[]{return definitions[room.shape||'rectangle'].points.map(([x,y])=>[room.x+x*room.w,room.y+y*room.d])}
export function roomPolygon(room:Footprint){return roomPoints(room).map(p=>p.join(',')).join(' ')}
// Disjoint cells provide exact occupied area and collision geometry for orthogonal footprints.
export function roomRects<T extends Footprint>(room:T):T[]{return definitions[room.shape||'rectangle'].cells.map(([x,y,w,d])=>({...room,x:room.x+x*room.w,y:room.y+y*room.d,w:w*room.w,d:d*room.d,shape:undefined} as T))}
export function roomArea(room:Footprint){return roomRects(room).reduce((sum,r)=>sum+r.w*r.d,0)}
export function roomLabelBox<T extends Footprint>(room:T):T{return roomRects(room).reduce((best,r)=>r.w*r.d>best.w*best.d?r:best)}
export function pointInRoom(room:Footprint,x:number,y:number){return roomRects(room).some(r=>x>=r.x-1e-7&&x<=r.x+r.w+1e-7&&y>=r.y-1e-7&&y<=r.y+r.d+1e-7)}
export function roomEdges(room:Footprint&{id?:string}){const points=roomPoints(room);return points.map((a,side)=>{const b=points[(side+1)%points.length];return{x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),x2:Math.max(a[0],b[0]),y2:Math.max(a[1],b[1]),side,roomId:room.id||''}})}
export function roomWallName(room:Footprint,side:number){const points=roomPoints(room),a=points[side],b=points[(side+1)%points.length];if(!a||!b)return 'Wall '+(side+1);const direction=b[0]>a[0]?'North':b[1]>a[1]?'East':b[0]<a[0]?'South':'West';return direction+' wall'+((room.shape||'rectangle')==='rectangle'?'':' '+(side+1))}
