import type {Floor} from './model.ts';
import {wallPoint} from './model.ts';
type WallLine={x:number;y:number;x2:number;y2:number};
// Cut the whole physical wall assembly, including duplicate/nearby image traces.
export function wallCells(floor:Floor,line:WallLine,height:number,thickness=.4){
 const length=Math.hypot(line.x2-line.x,line.y2-line.y);if(length<1e-7)return[];
 const ux=(line.x2-line.x)/length,uy=(line.y2-line.y)/length;
 const holes=floor.openings.flatMap(o=>{const room=floor.rooms.find(r=>r.id===o.roomId);if(!room)return[];
  const a=wallPoint(room,o.side,o.offset),b=wallPoint(room,o.side,o.offset+o.width);
  const distance=(p:number[])=>Math.abs((p[0]-line.x)*uy-(p[1]-line.y)*ux);
  if(distance(a)>thickness/2+.201||distance(b)>thickness/2+.201)return[];
  // Perpendicular walls at a jamb must remain intact.
  if(Math.abs((b[0]-a[0])*uy-(b[1]-a[1])*ux)>1e-6)return[];
  const t=(p:number[])=>(p[0]-line.x)*ux+(p[1]-line.y)*uy,lo=Math.max(0,Math.min(t(a),t(b))),hi=Math.min(length,Math.max(t(a),t(b)));
  return hi-lo>.001?[{lo,hi,bottom:Math.max(0,o.sill),top:Math.min(height,o.sill+o.height)}]:[];
 });
 const xs=[...new Set([0,length,...holes.flatMap(h=>[h.lo,h.hi])])].sort((a,b)=>a-b),cells:{start:number;end:number;low:number;high:number}[]=[];
 for(let i=1;i<xs.length;i++){const start=xs[i-1],end=xs[i],mid=(start+end)/2,active=holes.filter(h=>mid>h.lo&&mid<h.hi),ys=[...new Set([0,height,...active.flatMap(h=>[h.bottom,h.top]).filter(y=>y>0&&y<height)])].sort((a,b)=>a-b);
  for(let j=1;j<ys.length;j++){const low=ys[j-1],high=ys[j];if(!active.some(h=>(low+high)/2>h.bottom&&(low+high)/2<h.top))cells.push({start,end,low,high});}
 }
 return cells;
}

export function wallPlanSegments(floor:Floor,line:WallLine,height:number,thickness=.4){
 const length=Math.hypot(line.x2-line.x,line.y2-line.y);if(!length)return[];
 return wallCells(floor,line,height,thickness).filter(c=>c.low<1&&c.high>1).map(c=>({x:line.x+(line.x2-line.x)*c.start/length,y:line.y+(line.y2-line.y)*c.start/length,x2:line.x+(line.x2-line.x)*c.end/length,y2:line.y+(line.y2-line.y)*c.end/length}));
}
