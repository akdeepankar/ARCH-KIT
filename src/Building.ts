import {wallCells} from './wallOpenings.ts';
import {doorGeometry,DOOR_THICKNESS} from './doorGeometry.ts';
import {buildBoundary} from './boundaryGeometry.ts';
import {facadeMaterial} from './facadeMaterials.ts';
import {buildExteriorFeature} from './ExteriorFeatures.ts';
import * as THREE from 'three';
import {wallFaceColors,wallFaceFinishes,paletteWallColor,paletteExteriorColor} from './wallAppearance.ts';
import {buildRoof} from './Roof.ts';
import {floorRoofCutouts} from './roofGeometry.ts';
import {FLOOR_SLAB_THICKNESS,floorElevation,floorRise} from './levelGeometry.ts';
import {roomWalls,wallPoint,roomRects} from './model.ts';
import type {Project} from './model.ts';
type Solid={x:number;z:number;w:number;d:number;low:number;high:number};
export function buildBuilding(p:Project,cutaway=false){const group=new THREE.Group();const solids:Solid[]=[];const mat=(color:string,roughness=.85,opacity=1)=>new THREE.MeshStandardMaterial({color,roughness,transparent:opacity<1,opacity});
 const wallColor=paletteWallColor(p);const wallMat=facadeMaterial(p.finish,p.exteriorColor||paletteExteriorColor(p),cutaway?.42:1),frame=mat('#5b625d'),timber=mat('#a98663');
 function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material|THREE.Material[],collision=false){if(w<=0||h<=0||d<=0)return;const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);if(collision)mesh.userData.walkOccluder=true;if(collision)solids.push({x:x-w/2,z:z-d/2,w,d,low:y,high:y+h});return mesh}
 box(p.plot.w,.2,p.plot.d,p.plot.w/2,-.28,p.plot.d/2,mat('#d0d6c8'));
 p.floors.forEach((f,fi)=>{const base=floorElevation(p,fi),elevation=base+f.height;for(const r of f.rooms.flatMap(roomRects)){const holes=fi>0?p.floors[fi-1].stairs.filter(s=>s.to===f.id):[];const xs=[...new Set([r.x,r.x+r.w,...holes.flatMap(s=>[Math.max(r.x,s.x),Math.min(r.x+r.w,s.x+s.w)]).filter(x=>x>r.x&&x<r.x+r.w)])].sort((a,b)=>a-b);const zs=[...new Set([r.y,r.y+r.d,...holes.flatMap(s=>[Math.max(r.y,s.y),Math.min(r.y+r.d,s.y+s.d)]).filter(y=>y>r.y&&y<r.y+r.d)])].sort((a,b)=>a-b);for(let xi=1;xi<xs.length;xi++)for(let zi=1;zi<zs.length;zi++){const x=(xs[xi]+xs[xi-1])/2,z=(zs[zi]+zs[zi-1])/2;if(holes.some(h=>x>h.x&&x<h.x+h.w&&z>h.y&&z<h.y+h.d))continue;const floorFinish=mat(r.kind==='courtyard'?'#b4c29c':r.color),structure=mat('#cbc6bb'),ceiling=mat('#eeeae2');const slab=box(xs[xi]-xs[xi-1],FLOOR_SLAB_THICKNESS,zs[zi]-zs[zi-1],x,base-FLOOR_SLAB_THICKNESS,z,[structure,structure,floorFinish,ceiling,structure,structure]);if(slab){slab.name='Floor slab';slab.userData={floorId:f.id,walkOccluder:true};}}}
 for(const s of roomWalls(f)){const faces=wallFaceColors(p,f,s),finishes=wallFaceFinishes(p,f,s),positive=finishes.positive?facadeMaterial(finishes.positive,faces.positive,cutaway?.42:1):mat(faces.positive,.9,cutaway?.42:1),negative=finishes.negative?facadeMaterial(finishes.negative,faces.negative,cutaway?.42:1):mat(faces.negative,.9,cutaway?.42:1);
 const surfaceMaterials:THREE.Material[]=faces.horizontal?[wallMat,wallMat,wallMat,wallMat,positive,negative]:[positive,negative,wallMat,wallMat,wallMat,wallMat];const horizontal=s.y===s.y2;const start=horizontal?s.x:s.y,end=horizontal?s.x2:s.y2;const cells=wallCells(f,s,f.height);
 for(const cell of cells){const a=start+cell.start,b=start+cell.end;box(horizontal?b-a:.4,cell.high-cell.low,horizontal?.4:b-a,horizontal?(a+b)/2:s.x,base+cell.low,horizontal?s.y:(a+b)/2,surfaceMaterials,true);}

 }
 // Build each opening once, even when its wall is split by neighboring rooms.
 for(const o of f.openings){const room=f.rooms.find(r=>r.id===o.roomId);if(!room||o.kind==='passage')continue;
 if(o.kind==='window'){const a=wallPoint(room,o.side,o.offset),b=wallPoint(room,o.side,o.offset+o.width),horizontal=a[1]===b[1];const pane=(low:number,h:number,m:THREE.Material)=>box(horizontal?o.width:.4,h,horizontal?.4:o.width,(a[0]+b[0])/2,base+low,(a[1]+b[1])/2,m);pane(o.sill,o.height,mat('#a9cbd0',.15,.4));pane(o.sill,.09,frame);pane(o.sill+o.height-.09,.09,frame);continue;}
 const door=doorGeometry(room,o),pivot=new THREE.Group();pivot.name='Door hinge';pivot.position.set(door.hinge[0],base+o.sill,door.hinge[1]);pivot.rotation.y=door.rotation;pivot.userData={openingId:o.id,floorId:f.id};
 const leaf=new THREE.Mesh(new THREE.BoxGeometry(door.width,o.height,DOOR_THICKNESS),timber);leaf.name='Door leaf';leaf.position.set(door.width/2,o.height/2,0);leaf.castShadow=true;leaf.receiveShadow=true;leaf.userData={openingId:o.id,floorId:f.id};pivot.add(leaf);group.add(pivot);}
 for(const w of f.walls){const len=Math.hypot(w.x2-w.x,w.y2-w.y);if(len<1e-7)continue;const ux=(w.x2-w.x)/len,uz=(w.y2-w.y)/len,material=w.type==='Exterior'?facadeMaterial(w.finish||p.finish,w.color||p.exteriorColor||paletteExteriorColor(p,w.finish||p.finish),cutaway?.42:1):mat(w.color||p.interiorColor||wallColor,.9,cutaway?.42:1);
 for(const cell of wallCells(f,w,w.height,w.thickness)){const t=(cell.start+cell.end)/2,m=box(cell.end-cell.start,cell.high-cell.low,w.thickness,w.x+ux*t,base+cell.low,w.y+uz*t,material);if(m){m.rotation.y=-Math.atan2(uz,ux);m.userData.walkOccluder=true;const bounds=new THREE.Box3().setFromObject(m);solids.push({x:bounds.min.x,z:bounds.min.z,w:bounds.max.x-bounds.min.x,d:bounds.max.z-bounds.min.z,low:base+cell.low,high:base+cell.high});}}}

 for(const s of f.stairs){const rise=floorRise(f),count=Math.ceil(rise/(7/12)),rot=((s.rotation||0)%360+360)%360,isHoriz=rot===90||rot===270,tread=(isHoriz?s.w:s.d)/count;for(let i=0;i<count;i++){const h=(i+1)*rise/count,step=rot===180?box(s.w,h,tread,s.x+s.w/2,base,s.y+(i+.5)*tread,timber):rot===90?box(tread,h,s.d,s.x+(i+.5)*tread,base,s.y+s.d/2,timber):rot===270?box(tread,h,s.d,s.x+s.w-(i+.5)*tread,base,s.y+s.d/2,timber):box(s.w,h,tread,s.x+s.w/2,base,s.y+s.d-(i+.5)*tread,timber);if(step){step.name='Stair tread';step.userData.floorId=f.id}}}
 for(const e of f.exteriors)group.add(buildExteriorFeature(f,e,base));
 if(!cutaway&&p.roof!=='None'){const roof=buildRoof(f.rooms,p.roof,p.parapet,elevation,wallMat,floorRoofCutouts(p,fi));roof.userData.floorId=f.id;group.add(roof);}
 });
 const boundary=buildBoundary(p,cutaway);group.add(boundary.group);solids.push(...boundary.solids);return{group,solids}}
