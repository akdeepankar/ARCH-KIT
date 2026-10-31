import * as THREE from 'three';
import type {Project} from './model.ts';
export const boundaryStyles=['Solid wall','Wall + railing','Vertical rods','Horizontal slats'] as const;
export const gateStyles=['Rod gate','Horizontal slat gate','Solid panel gate','Arched rod gate'] as const;
export type BoundarySolid={x:number;z:number;w:number;d:number;low:number;high:number};
export const gateSides=['Front','North','East','South','West'] as const;
export const gateSide=(p:Project)=>p.gateSide&&p.gateSide!=='Front'?p.gateSide:p.plot.front;
export const gateWallLength=(p:Project)=>['North','South'].includes(gateSide(p))?p.plot.w:p.plot.d;
export function boundaryLayout(p:Project){const w=p.plot.w,d=p.plot.d;return [{name:'North',x:0,z:0,dx:1,dz:0,length:w},{name:'East',x:w,z:0,dx:0,dz:1,length:d},{name:'South',x:w,z:d,dx:-1,dz:0,length:w},{name:'West',x:0,z:d,dx:0,dz:-1,length:d}].map(side=>{
 const gate=side.name===gateSide(p)&&p.gate,opening=gate?Math.min(p.gateWidth,side.length):0;
 // Position is measured consistently west-to-east or north-to-south,
 // while perimeter segments themselves run clockwise.
 const position=Math.max(0,Math.min(1,p.gatePosition??.5)),forward=side.dx>0||side.dz>0,start=(side.length-opening)*(forward?position:1-position);
 return {...side,gate,opening,gateStart:start,gateEnd:start+opening};
});}

export function buildBoundary(p:Project,cutaway=false){
 const group=new THREE.Group();group.name='Boundary & gate';const solids:BoundarySolid[]=[];if(!p.boundary)return {group,solids};
 const wallStyle=p.boundaryStyle||'Solid wall',gateStyle=p.gateStyle||'Rod gate',height=p.wallHeight,thickness=p.wallThickness,gateHeight=p.gateHeight||4,spacing=p.rodSpacing||.5;
 const wallMaterial=new THREE.MeshStandardMaterial({color:p.boundaryColor||'#d2cec2',roughness:.9,transparent:cutaway,opacity:cutaway?.6:1});
 const metal=new THREE.MeshStandardMaterial({color:p.gateColor||'#424a45',roughness:.48,metalness:.6});
 for(const side of boundaryLayout(p)){
  const frame=new THREE.Group();frame.name='Boundary '+side.name;frame.position.set(side.x,0,side.z);frame.rotation.y=-Math.atan2(side.dz,side.dx);group.add(frame);
  const box=(w:number,h:number,d:number,x:number,y:number,material:THREE.Material,name='Boundary member')=>{if(w<=0||h<=0)return;const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y+h/2,0);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.walkOccluder=true;mesh.name=name;frame.add(mesh);return mesh;};
  const collision=(start:number,end:number,h:number)=>{const x1=side.x+side.dx*start,z1=side.z+side.dz*start,x2=side.x+side.dx*end,z2=side.z+side.dz*end;solids.push({x:Math.min(x1,x2)-(side.dx===0?thickness/2:0),z:Math.min(z1,z2)-(side.dz===0?thickness/2:0),w:side.dx===0?thickness:end-start,d:side.dz===0?thickness:end-start,low:0,high:h});};
  const rods=(start:number,end:number,bottom:number,top:number,arched=false)=>{
   const length=end-start,n=Math.max(2,Math.min(256,Math.ceil(length/spacing)));
   for(let i=1;i<n;i++){const x=start+length*i/n,h=arched?top-.6+Math.sin(i/n*Math.PI)*.6:top;box(.07,h-bottom,.07,x,bottom,metal,arched?'Arched gate rod':'Vertical rod');}
   box(length,.1,.1,(start+end)/2,bottom,metal);if(!arched)box(length,.1,.1,(start+end)/2,top-.1,metal);
  };
  const slats=(start:number,end:number,bottom:number,top:number)=>{for(let y=bottom;y<top;y+=.4)box(end-start,Math.min(.25,top-y),.1,(start+end)/2,y,metal,'Horizontal slat');};
  const wall=(start:number,end:number)=>{const length=end-start;if(length<=0)return;collision(start,end,height);
   if(wallStyle==='Solid wall')box(length,height,thickness,(start+end)/2,0,wallMaterial,'Solid boundary wall');
   else if(wallStyle==='Wall + railing'){const low=height*.45;box(length,low,thickness,(start+end)/2,0,wallMaterial,'Boundary plinth');rods(start,end,low,height);}
   else if(wallStyle==='Horizontal slats')slats(start,end,0,height);else rods(start,end,0,height);
   if(wallStyle!=='Solid wall'){const n=Math.max(1,Math.ceil(length/8));for(let i=0;i<=n;i++)box(Math.max(.16,thickness*.5),height,Math.max(.16,thickness*.5),start+length*i/n,0,metal,'Boundary post');}
  };
  if(!side.gate){wall(0,side.length);continue;}
  const start=side.gateStart,end=side.gateEnd;wall(0,start);wall(end,side.length);collision(start,end,gateHeight);
  for(const x of [start,end])box(Math.max(thickness,.24),Math.max(height,gateHeight)+.2,Math.max(thickness,.24),x,0,wallMaterial,'Gate pillar');
  if(gateStyle==='Solid panel gate')box(side.opening,gateHeight,.12,(start+end)/2,0,metal,'Solid gate panel');
  else if(gateStyle==='Horizontal slat gate')slats(start,end,0,gateHeight);
  else rods(start,end,0,gateHeight,gateStyle==='Arched rod gate');
  box(.1,gateHeight,.12,(start+end)/2,0,metal,'Gate meeting stile');
  if(gateStyle==='Arched rod gate'){
   const points=Array.from({length:25},(_,i)=>new THREE.Vector3(start+side.opening*i/24,gateHeight-.6+Math.sin(i/24*Math.PI)*.6,0));
   const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.055,5,false),metal);rail.name='Arched gate rail';frame.add(rail);
  }
 }
 return {group,solids};
}
