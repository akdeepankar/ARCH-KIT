import * as THREE from 'three';
import {exteriorPlacement} from './exteriorDesign.ts';
import {roomEdges} from './model.ts';
import type {Exterior,Floor} from './model.ts';
import {FLOOR_SLAB_THICKNESS} from './levelGeometry.ts';
export function buildExteriorFeature(floor:Floor,feature:Exterior,base:number){
 const e=exteriorPlacement(floor,feature),group=new THREE.Group();group.name=e.kind;group.userData.featureId=e.id;
 let width=e.w,depth=e.d;group.position.set(e.x,base,e.y);
 if(e.roomId){const room=floor.rooms.find(r=>r.id===e.roomId)!,edge=roomEdges(room).find(s=>s.side===e.side)!;const horizontal=edge.y===edge.y2; width=e.width!;depth=e.projection!;
  if(horizontal){group.position.set(e.x,base,edge.y);group.scale.z=e.y>=edge.y?1:-1;}
  else{group.position.set(edge.x,base,e.y);group.rotation.y=-Math.PI/2;group.scale.z=e.x>=edge.x?-1:1;}
 }
 const mat=new THREE.MeshStandardMaterial({color:e.color||(e.variant==='timber'||e.variant==='pergola'?'#a98663':'#939b94'),roughness:.8});
 const slabMat=new THREE.MeshStandardMaterial({color:e.color||(e.variant==='timber'?'#af916b':'#c6c1b5'),roughness:.9});
 const glass=new THREE.MeshStandardMaterial({color:'#a9cbd0',transparent:true,opacity:.36,roughness:.2});
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
 if(e.kind==='Terrace'||e.kind==='Balcony'){
  box(width,FLOOR_SLAB_THICKNESS,depth,width/2,-FLOOR_SLAB_THICKNESS,depth/2,slabMat);
  const railing=(w:number,d:number,x:number,z:number)=>{if(e.variant==='glass'){box(w,2.9,d,x,0,z,glass);box(w,.08,d,x,2.9,z);}else{box(w,.1,d,x,2.9,z);const span=Math.max(w,d),n=Math.ceil(span/2);for(let i=0;i<=n;i++)box(.09,3,.09,x+(w>d?(i/n-.5)*w:0),0,z+(d>w?(i/n-.5)*d:0));}};
  railing(width,.1,width/2,depth);if(e.variant!=='juliet'){railing(.1,depth,0,depth/2);railing(.1,depth,width,depth/2);}
  if(e.variant==='timber')for(let x=.3;x<width;x+=.6)box(.025,.015,depth,x,.005,depth/2,mat);
 }else if(e.kind==='Canopy'){
  const height=floor.height-1;
  if(e.variant==='pergola'){box(width,.2,.2,width/2,height,0);box(width,.2,.2,width/2,height,depth);for(let x=0;x<=width;x+=.75)box(.14,.22,depth,x,height,depth/2);for(const x of [0,width])box(.16,height,.16,x,0,depth);}
  else if(e.variant==='pitched'){const angle=.18,length=Math.hypot(depth,.18*depth);const roof=box(width,.2,length,width/2,height,depth/2);roof.rotation.x=angle;}
  else box(width,.22,depth,width/2,height,depth/2);
 }else if(e.kind==='Frame'){
  const height=Math.min(8,floor.height-.5),thickness=e.variant==='box'?.35:.2,projection=e.variant==='box'?Math.max(depth,.9):depth;
  box(thickness,height,projection,thickness/2,0,projection/2);box(thickness,height,projection,width-thickness/2,0,projection/2);box(width,thickness,projection,width/2,height-thickness,projection/2);if(e.variant==='box')box(width,thickness,projection,width/2,0,projection/2);
 }else if(e.kind==='Sunshade'){
  const bottom=Math.max(2,floor.height-5),height=Math.min(4,floor.height-2);
  if(e.variant==='vertical'||e.variant==='louvered')for(let x=0;x<=width;x+=.7)box(.1,height,depth,x,bottom,depth/2);
  if(e.variant!=='vertical')for(let y=bottom;y<=bottom+height;y+=.7){const blade=box(width,.1,depth,width/2,y,depth/2);blade.rotation.x=-.15;}
 }
 return group;
}
