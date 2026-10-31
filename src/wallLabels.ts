import {roomEdges,roomWallName,roomWalls,pointInRoom,wallPoint} from './model.ts';
import type {Project,Floor,Room,Segment} from './model.ts';
export type WallAnchor={x:number;y:number;nx:number;ny:number};
export type WallLabel={code:string;label:string;shortName:string;floorId:string;floorName:string;roomId?:string;roomName?:string;side?:number;wallId?:string;face:'interior'|'exterior'|'wall';height:number;anchors:WallAnchor[]};
function anchorOnSegment(f:Floor,s:Segment,preferred?:number){
 const horizontal=s.y===s.y2,lo=horizontal?s.x:s.y,hi=horizontal?s.x2:s.y2;let spans:[number,number][]=[[lo,hi]];
 for(const o of f.openings){const r=f.rooms.find(r=>r.id===o.roomId);if(!r||o.side%2!==(horizontal?0:1))continue;const [x,y]=wallPoint(r,o.side,o.offset);if(Math.abs((horizontal?y:x)-(horizontal?s.y:s.x))>.01)continue;const a=horizontal?x:y,b=a+o.width;spans=spans.flatMap(([l,h])=>b<=l||a>=h?[[l,h]]:[...(a>l?[[l,Math.min(a,h)] as [number,number]]:[]),...(b<h?[[Math.max(b,l),h] as [number,number]]:[])]);}
 const best=spans.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];if(!best||best[1]-best[0]<.4)return null;const middle=preferred===undefined?(best[0]+best[1])/2:Math.max(best[0]+.2,Math.min(best[1]-.2,preferred));return {x:horizontal?middle:s.x,y:horizontal?s.y:middle,length:best[1]-best[0]};
}
export function projectWallLabels(project:Project):WallLabel[]{
 const ids=project.floors.flatMap(f=>[...f.rooms,...f.walls].map(e=>e.id));
 const token=(id:string)=>{const compact=id.replace(/[^a-z0-9]/gi,'').toUpperCase();for(const size of [8,12,compact.length]){const prefix=compact.slice(0,size);if(ids.filter(other=>other.replace(/[^a-z0-9]/gi,'').toUpperCase().startsWith(prefix)).length===1)return prefix;}return id;};
 const labels:WallLabel[]=[];
 for(const f of project.floors){const segments=roomWalls(f);
  for(const r of f.rooms.filter(r=>r.kind!=='courtyard'))for(const edge of roomEdges(r)){
   const horizontal=edge.y===edge.y2,mx=(edge.x+edge.x2)/2,my=(edge.y+edge.y2)/2;
   const positive=pointInRoom(r,horizontal?mx:mx+.01,horizontal?my+.01:my),nx=horizontal?0:positive?1:-1,ny=horizontal?(positive?1:-1):0;
   const matching=segments.filter(s=>s.rooms.includes(r.id)&&(horizontal?s.y===edge.y&&s.y2===edge.y&&s.x>=edge.x-1e-7&&s.x2<=edge.x2+1e-7:s.x===edge.x&&s.x2===edge.x&&s.y>=edge.y-1e-7&&s.y2<=edge.y2+1e-7));
   for(const face of ['interior','exterior'] as const){const candidates=(face==='interior'?matching:matching.filter(s=>s.rooms.length===1)).map(s=>anchorOnSegment(f,s,horizontal?mx:my)).filter(a=>!!a).sort((a,b)=>b!.length-a!.length);if(face==='exterior'&&!matching.some(s=>s.rooms.length===1))continue;
    const a=candidates[0],direction=face==='interior'?1:-1;const code=`W-${token(r.id)}-${edge.side+1}${face==='exterior'?'E':''}`;
    const shortName=`${r.name} · ${roomWallName(r,edge.side)}${face==='exterior'?' · exterior':''}`;
    labels.push({code,label:`${f.name} / ${shortName} [${code}]`,shortName,floorId:f.id,floorName:f.name,roomId:r.id,roomName:r.name,side:edge.side,face,height:Math.min(5.6,f.height-.7),anchors:a?[{x:a.x+nx*direction*.24,y:a.y+ny*direction*.24,nx:nx*direction,ny:ny*direction}]:[]});
   }
  }
  for(const w of f.walls){const length=Math.hypot(w.x2-w.x,w.y2-w.y);if(!length)continue;const nx=-(w.y2-w.y)/length,ny=(w.x2-w.x)/length,x=(w.x+w.x2)/2,y=(w.y+w.y2)/2,code=`W-${token(w.id)}`,shortName=`${w.type} wall ${code.slice(2)}`;
   labels.push({code,label:`${f.name} / ${shortName} [${code}]`,shortName,floorId:f.id,floorName:f.name,wallId:w.id,face:'wall',height:Math.min(5.6,w.height-.4),anchors:[1,-1].map(sign=>({x:x+nx*sign*(w.thickness/2+.04),y:y+ny*sign*(w.thickness/2+.04),nx:nx*sign,ny:ny*sign}))});
  }
 }
 return labels;
}
export function resolveWallLabel(project:Project,reference:string){const key=reference.trim().toLowerCase(),labels=projectWallLabels(project);const exact=labels.find(l=>l.code.toLowerCase()===key||l.label.toLowerCase()===key);if(exact)return exact;const matches=labels.filter(l=>l.shortName.toLowerCase()===key||l.face!=='exterior'&&`${l.roomName} ${l.side===undefined?'':roomWallName(project.floors.find(f=>f.id===l.floorId)!.rooms.find(r=>r.id===l.roomId)!,l.side)}`.trim().toLowerCase()===key);if(matches.length===1)return matches[0];throw Error(matches.length?'That wall name is ambiguous. Use its W- reference.':'Wall label not found. Use the displayed W- reference or inspect the current wallLabels.');}
