import type {Project} from '../model';
import {roomWalls,wallPoint,roomPoints,roomLabelBox} from '../model';
export async function captureFloorPlan(project:Project):Promise<string>{
 const cols=Math.min(3,project.floors.length),rows=Math.ceil(project.floors.length/cols),cw=520,ch=620;
 const canvas=document.createElement('canvas');canvas.width=cw*cols;canvas.height=ch*rows;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 project.floors.forEach((floor,i)=>{
  const ox=(i%cols)*cw,oy=Math.floor(i/cols)*ch,scale=Math.min((cw-90)/project.plot.w,(ch-105)/project.plot.d),x0=ox+(cw-project.plot.w*scale)/2,y0=oy+65;
  const pt=(x:number,y:number):[number,number]=>[x0+x*scale,y0+y*scale];
  ctx.fillStyle='#222';ctx.font='bold 15px sans-serif';ctx.fillText(floor.name,ox+25,oy+25);ctx.font='12px sans-serif';ctx.fillText(`Plot ${project.plot.w} × ${project.plot.d} ft · Front ${project.plot.front} · ↑ North`,ox+25,oy+45);
  ctx.strokeStyle='#999';ctx.lineWidth=1;ctx.strokeRect(x0,y0,project.plot.w*scale,project.plot.d*scale);
  for(const r of floor.rooms){const points=roomPoints(r),label=roomLabelBox(r);ctx.fillStyle=r.color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(...pt(x,y)):ctx.moveTo(...pt(x,y)));ctx.closePath();ctx.fill();ctx.fillStyle='#222';ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillText(r.name,...pt(label.x+label.w/2,label.y+label.d/2),Math.max(20,label.w*scale-4));ctx.font='9px sans-serif';ctx.fillText(`${r.w} × ${r.d} ft`,...pt(label.x+label.w/2,label.y+label.d/2+1.1),Math.max(20,label.w*scale-4));ctx.textAlign='left'}
  ctx.strokeStyle='#333';ctx.lineWidth=2;
  for(const w of [...roomWalls(floor),...floor.walls]){ctx.beginPath();ctx.moveTo(...pt(w.x,w.y));ctx.lineTo(...pt(w.x2,w.y2));ctx.stroke()}
  for(const o of floor.openings){const r=floor.rooms.find(r=>r.id===o.roomId);if(!r)continue;ctx.strokeStyle=o.kind==='window'?'#17849a':o.kind==='passage'?'#ffffff':'#b45c31';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(...pt(...wallPoint(r,o.side,o.offset)));ctx.lineTo(...pt(...wallPoint(r,o.side,o.offset+o.width)));ctx.stroke()}
  ctx.fillStyle='#666';ctx.font='10px sans-serif';ctx.fillText('Blue: windows · Brown: doors · White: open passages · Feet',ox+25,oy+ch-16);
 });return canvas.toDataURL('image/png');
}
export async function readReference(file:File):Promise<string>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG, or WebP image.');
 if(file.size>12_000_000)throw Error('Choose an image smaller than 12 MB.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>60_000_000){bitmap.close();throw Error('Image dimensions are too large.');}
 const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c.toDataURL('image/jpeg',.94);
}
