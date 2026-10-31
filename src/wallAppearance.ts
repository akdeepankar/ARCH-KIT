import {finishProfiles} from './facadeMaterials.ts';
import {pointInRoom,roomEdges} from './roomGeometry.ts';
import type {Project,Floor,Segment} from './model.ts';
export const paletteWallColor=(p:Project)=>p.finish==='Concrete & charcoal'?'#94948e':p.finish==='Brick & stone'?'#b58470':'#e9e5dc';
export const paletteExteriorColor=(p:Project,finish=p.finish)=>finishProfiles[finish]?.color||paletteWallColor({...p,finish});
export function wallFaceColors(p:Project,f:Floor,s:Segment){
 const horizontal=s.y===s.y2,x=(s.x+s.x2)/2,y=(s.y+s.y2)/2;
 const hosts=s.rooms.map(id=>f.rooms.find(r=>r.id===id)).filter(r=>!!r).map(r=>({room:r!,edge:roomEdges(r!).find(e=>horizontal?e.y===s.y&&e.y2===s.y&&x>=e.x-1e-7&&x<=e.x2+1e-7:e.x===s.x&&e.x2===s.x&&y>=e.y-1e-7&&y<=e.y2+1e-7)}));
 const color=(positive:boolean)=>{
  const inward=hosts.find(({room})=>pointInRoom(room,horizontal?x:x+(positive?.01:-.01),horizontal?y+(positive?.01:-.01):y));
  if(inward)return inward.room.wallColors?.[String(inward.edge?.side)]||inward.room.wallColor||p.interiorColor||paletteWallColor(p);
  const host=hosts[0];return host?.room.exteriorColors?.[String(host.edge?.side)]||host?.room.exteriorColor||p.exteriorColor||paletteExteriorColor(p,host?.room.exteriorFinishes?.[String(host.edge?.side)]||host?.room.exteriorFinish||p.finish);
 };
 return {positive:color(true),negative:color(false),horizontal};
}

export function wallFaceFinishes(p:Project,f:Floor,s:Segment){
 const horizontal=s.y===s.y2,x=(s.x+s.x2)/2,y=(s.y+s.y2)/2;
 const finish=(positive:boolean)=>{
  if(s.rooms.some(id=>{const room=f.rooms.find(r=>r.id===id);return room&&pointInRoom(room,horizontal?x:x+(positive?.01:-.01),horizontal?y+(positive?.01:-.01):y)}))return undefined;
  const room=f.rooms.find(r=>r.id===s.rooms[0]),edge=room&&roomEdges(room).find(e=>horizontal?e.y===s.y&&e.y2===s.y&&x>=e.x&&x<=e.x2:e.x===s.x&&e.x2===s.x&&y>=e.y&&y<=e.y2);
  return room?.exteriorFinishes?.[String(edge?.side)]||room?.exteriorFinish||p.finish;
 };
 return {positive:finish(true),negative:finish(false)};
}
