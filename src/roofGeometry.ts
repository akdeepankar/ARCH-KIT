import {roomRects} from './roomGeometry.ts';
import type {Project} from './model.ts';
import type {RoomShape} from './roomGeometry.ts';
export type RoofPoint=[number,number];
export type RoofCell={x:number;y:number;w:number;d:number};
export type RoofFootprint={cells:RoofCell[];loops:RoofPoint[][];x:number;y:number;w:number;d:number};
type RoofRoom=RoofCell&{shape?:RoomShape;kind:string};
const snap=(v:number)=>Math.round(v*1e7)/1e7;
export const signedArea=(points:RoofPoint[])=>points.reduce((area,p,i)=>{const q=points[(i+1)%points.length];return area+p[0]*q[1]-q[0]*p[1]},0)/2;

// Coordinate compression unions exact occupied cells, including partial shared edges.
// Flooding across edges (never corners) keeps detached buildings independent.
export function roofFootprints(rooms:RoofRoom[],cutouts:RoofCell[]=[]):RoofFootprint[]{
 const rects=rooms.filter(r=>r.kind!=='courtyard').flatMap(roomRects);
 if(!rects.length)return [];
 const bounds={x:Math.min(...rects.map(r=>r.x)),y:Math.min(...rects.map(r=>r.y)),right:Math.max(...rects.map(r=>r.x+r.w)),bottom:Math.max(...rects.map(r=>r.y+r.d))};
 const clips=cutouts.map(r=>({x:Math.max(r.x,bounds.x),y:Math.max(r.y,bounds.y),w:Math.min(r.x+r.w,bounds.right)-Math.max(r.x,bounds.x),d:Math.min(r.y+r.d,bounds.bottom)-Math.max(r.y,bounds.y)})).filter(r=>r.w>1e-7&&r.d>1e-7);
 const coordinates=[...rects,...clips];
 const xs=[...new Set(coordinates.flatMap(r=>[snap(r.x),snap(r.x+r.w)]))].sort((a,b)=>a-b);
 const ys=[...new Set(coordinates.flatMap(r=>[snap(r.y),snap(r.y+r.d)]))].sort((a,b)=>a-b);
 const nx=xs.length,ny=ys.length,stride=ny-1;
 const xIndex=new Map(xs.map((x,i)=>[x,i])),yIndex=new Map(ys.map((y,i)=>[y,i]));
 const diff=new Int32Array(nx*ny),removed=new Int32Array(nx*ny);
 const mark=(r:RoofCell,grid:Int32Array)=>{const a=xIndex.get(snap(r.x))!,b=xIndex.get(snap(r.x+r.w))!,c=yIndex.get(snap(r.y))!,d=yIndex.get(snap(r.y+r.d))!;grid[a*ny+c]++;grid[b*ny+c]--;grid[a*ny+d]--;grid[b*ny+d]++;};
 rects.forEach(r=>mark(r,diff));clips.forEach(r=>mark(r,removed));
 const occupied=new Uint8Array((nx-1)*stride);
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const k=i*ny+j;diff[k]+=(i?diff[k-ny]:0)+(j?diff[k-1]:0)-(i&&j?diff[k-ny-1]:0);removed[k]+=(i?removed[k-ny]:0)+(j?removed[k-1]:0)-(i&&j?removed[k-ny-1]:0);if(i<nx-1&&j<ny-1&&diff[k]>0&&removed[k]===0)occupied[i*stride+j]=1;}
 const seen=new Uint8Array(occupied.length),result:RoofFootprint[]=[];
 for(let seed=0;seed<occupied.length;seed++){
  if(!occupied[seed]||seen[seed])continue;
  const queue=[seed],cells:RoofCell[]=[],edges:{a:number;b:number;dir:number}[]=[];seen[seed]=1;
  const add=(a:number,b:number,dir:number)=>edges.push({a,b,dir});
  for(let q=0;q<queue.length;q++){
   const k=queue[q],i=Math.floor(k/stride),j=k%stride;
   cells.push({x:xs[i],y:ys[j],w:xs[i+1]-xs[i],d:ys[j+1]-ys[j]});
   const adjacent=[j>0?k-1:-1,i<nx-2?k+stride:-1,j<stride-1?k+1:-1,i>0?k-stride:-1];
   for(const n of adjacent)if(n>=0&&occupied[n]&&!seen[n]){seen[n]=1;queue.push(n)}
   if(adjacent[0]<0||!occupied[adjacent[0]])add(i*ny+j,(i+1)*ny+j,0);
   if(adjacent[1]<0||!occupied[adjacent[1]])add((i+1)*ny+j,(i+1)*ny+j+1,1);
   if(adjacent[2]<0||!occupied[adjacent[2]])add((i+1)*ny+j+1,i*ny+j+1,2);
   if(adjacent[3]<0||!occupied[adjacent[3]])add(i*ny+j+1,i*ny+j,3);
  }
  const outgoing=new Map<number,number[]>();edges.forEach((e,i)=>outgoing.set(e.a,[...(outgoing.get(e.a)||[]),i]));
  const used=new Set<number>(),loops:RoofPoint[][]=[];
  const point=(k:number):RoofPoint=>[xs[Math.floor(k/ny)],ys[k%ny]];
  for(let start=0;start<edges.length;start++){
   if(used.has(start))continue;
   const loop:RoofPoint[]=[];let current=start;
   while(!used.has(current)){
    const e=edges[current];used.add(current);loop.push(point(e.a));
    if(e.b===edges[start].a)break;
    const choices=(outgoing.get(e.b)||[]).filter(n=>!used.has(n));
    // Follow the occupied side at a vertex where boundaries touch.
    const rank=(n:number)=>[1,0,3,2].indexOf((edges[n].dir-e.dir+4)%4);
    choices.sort((a,b)=>rank(a)-rank(b));
    if(!choices.length)throw new Error('Roof outline did not close');
    current=choices[0];
   }
   loops.push(loop.filter((p,i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-10}));
  }
  const bounds=cells.reduce((b,c)=>({x:Math.min(b.x,c.x),y:Math.min(b.y,c.y),right:Math.max(b.right,c.x+c.w),bottom:Math.max(b.bottom,c.y+c.d)}),{x:Infinity,y:Infinity,right:-Infinity,bottom:-Infinity});
  result.push({cells,loops,x:bounds.x,y:bounds.y,w:bounds.right-bounds.x,d:bounds.bottom-bounds.y});
 }
 return result;
}

// Upper-floor slabs replace the roof below them; stair connections stay open.
export function floorRoofCutouts(project:Project,index:number):RoofCell[]{
 const floor=project.floors[index],above=project.floors[index+1];
 return [...(above?.rooms.flatMap(roomRects)||[]),...floor.stairs.filter(s=>above&&s.to===above.id)];
}
export function roofParapetEdges(loop:RoofPoint[],cutouts:RoofCell[]):[RoofPoint,RoofPoint][]{
 const result:[RoofPoint,RoofPoint][]=[];
 for(let i=0;i<loop.length;i++){
  const a=loop[i],b=loop[(i+1)%loop.length],horizontal=a[1]===b[1],axis=horizontal?0:1,low=Math.min(a[axis],b[axis]),high=Math.max(a[axis],b[axis]);
  const cuts=[...new Set([low,high,...cutouts.flatMap(r=>horizontal?[r.x,r.x+r.w]:[r.y,r.y+r.d]).filter(v=>v>low&&v<high)])].sort((a,b)=>a-b);
  for(let j=1;j<cuts.length;j++){const mid=(cuts[j-1]+cuts[j])/2,x=horizontal?mid:a[0],y=horizontal?a[1]:mid;
   if(cutouts.some(r=>x>=r.x-1e-7&&x<=r.x+r.w+1e-7&&y>=r.y-1e-7&&y<=r.y+r.d+1e-7))continue;
   result.push(horizontal?[[cuts[j-1],a[1]],[cuts[j],a[1]]]:[[a[0],cuts[j-1]],[a[0],cuts[j]]]);
  }
 }
 return result;
}
