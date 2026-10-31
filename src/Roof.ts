import * as THREE from 'three';
import {FLOOR_SLAB_THICKNESS} from './levelGeometry.ts';
import {roofFootprints,signedArea,roofParapetEdges} from './roofGeometry.ts';
import type {RoofPoint,RoofCell} from './roofGeometry.ts';
import type {Room} from './model.ts';

export function buildRoof(rooms:Room[],type:string,parapet:number,elevation:number,wallMaterial:THREE.Material,cutouts:RoofCell[]=[]){
 const group=new THREE.Group();group.name='Roof';
 const material=new THREE.MeshStandardMaterial({color:type==='Pitched roof'?'#797971':'#cbc6bb',roughness:.85});
 const add=(geometry:THREE.BufferGeometry,m:THREE.Material=material)=>{const mesh=new THREE.Mesh(geometry,m);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh};
 for(const footprint of roofFootprints(rooms,cutouts)){
  if(type==='Pitched roof'){
   // One ridge and continuous roof surface per connected footprint, clipped to
   // its occupied cells so concavities and courtyard openings stay uncovered.
   const ridge=footprint.x+footprint.w/2;
   const height=(x:number)=>3*(1-Math.abs(x-ridge)/(footprint.w/2));
   const vertices:number[]=[];
   const triangle=(a:number[],b:number[],c:number[])=>vertices.push(...a,...b,...c);
   for(const c of footprint.cells){
    const a=[c.x,0,c.y],b=[c.x+c.w,0,c.y],d=[c.x,0,c.y+c.d],e=[c.x+c.w,0,c.y+c.d];
    triangle(a,b,d);triangle(b,e,d);
    const cuts=[c.x,...(ridge>c.x&&ridge<c.x+c.w?[ridge]:[]),c.x+c.w];
    for(let i=1;i<cuts.length;i++){
     const a=[cuts[i-1],height(cuts[i-1]),c.y],b=[cuts[i],height(cuts[i]),c.y],d=[cuts[i-1],height(cuts[i-1]),c.y+c.d],e=[cuts[i],height(cuts[i]),c.y+c.d];
     triangle(a,d,b);triangle(b,d,e);
    }
   }
   for(const loop of footprint.loops)for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length];
    const points:RoofPoint[]=[a,...((a[0]<ridge&&b[0]>ridge)||(b[0]<ridge&&a[0]>ridge)?[[ridge,a[1]] as RoofPoint]:[]),b];
    for(let j=1;j<points.length;j++){
     const p=points[j-1],q=points[j],lowA=[p[0],0,p[1]],lowB=[q[0],0,q[1]],highA=[p[0],height(p[0]),p[1]],highB=[q[0],height(q[0]),q[1]];
     triangle(lowA,highA,lowB);triangle(lowB,highA,highB);
    }
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();add(geometry).position.y=elevation;
  }else{
   const outer=footprint.loops.find(loop=>signedArea(loop)>0)!;
   const trace=(path:THREE.Path,points:RoofPoint[])=>{points.forEach(([x,y],i)=>i?path.lineTo(x,-y):path.moveTo(x,-y));path.closePath();return path};
   const shape=trace(new THREE.Shape(),outer) as THREE.Shape;
   shape.holes=footprint.loops.filter(loop=>signedArea(loop)<0).map(loop=>trace(new THREE.Path(),loop));
   const slab=add(new THREE.ExtrudeGeometry(shape,{depth:FLOOR_SLAB_THICKNESS,bevelEnabled:false}));slab.rotation.x=-Math.PI/2;slab.position.y=elevation;
   // Parapets belong only on exposed perimeter edges, never shared room walls.
   if(parapet>0)for(const loop of footprint.loops)for(const [a,b] of roofParapetEdges(loop,cutouts)){
    const horizontal=a[1]===b[1];
    const mesh=add(new THREE.BoxGeometry(horizontal?Math.abs(b[0]-a[0]):.25,parapet,horizontal?.25:Math.abs(b[1]-a[1])),wallMaterial);
    mesh.position.set((a[0]+b[0])/2,elevation+parapet/2,(a[1]+b[1])/2);
   }
  }
 }
 return group;
}
