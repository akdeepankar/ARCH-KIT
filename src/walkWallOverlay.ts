import * as THREE from 'three';
import {floorElevation} from './levelGeometry';
import {projectWallLabels} from './wallLabels';
import type {WallLabel} from './wallLabels';
import type {Project} from './model';
export function createWalkWallOverlay(project:Project,host:HTMLElement,building:THREE.Group,onSelect:(wall:WallLabel)=>void){
 const layer=document.createElement('div');layer.className='walk-wall-labels';layer.setAttribute('aria-label','Wall labels');host.appendChild(layer);
 const entries=projectWallLabels(project).flatMap(label=>{
  const fi=project.floors.findIndex(f=>f.id===label.floorId);
  const floorBase=floorElevation(project,fi>=0?fi:0);
  return label.anchors.map(anchor=>{
   const button=document.createElement('button');button.type='button';button.hidden=true;button.className='walk-wall-label';button.setAttribute('aria-label',label.label);button.title=label.label+' · Select for properties or tell the assistant this reference.';button.dataset.wallCode=label.code;
   const name=document.createElement('span');name.textContent=label.shortName;const code=document.createElement('small');code.textContent=label.code;button.appendChild(name);button.appendChild(code);button.onclick=event=>{event.stopPropagation();onSelect(label);};layer.appendChild(button);
   return {label,anchor,button,point:new THREE.Vector3(anchor.x,floorBase+label.height,anchor.y)};
  });
 });
 const occluders:THREE.Object3D[]=[];building.traverse(object=>{if(object.userData.walkOccluder)occluders.push(object);});building.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),direction=new THREE.Vector3(),projected=new THREE.Vector3();
 return {update(camera:THREE.Camera,enabled:boolean,selectedCode?:string){layer.hidden=!enabled;if(!enabled)return;
  const width=host.clientWidth,height=host.clientHeight,occupied:{x:number;y:number;w:number;h:number}[]=[];
  for(const entry of [...entries].sort((a,b)=>camera.position.distanceToSquared(a.point)-camera.position.distanceToSquared(b.point))){const {button,point,anchor,label}=entry;button.hidden=true;
   if((camera.position.x-point.x)*anchor.nx+(camera.position.z-point.z)*anchor.ny<=.04)continue;
   projected.copy(point).project(camera);if(projected.z<-1||projected.z>1||Math.abs(projected.x)>.94||Math.abs(projected.y)>.9)continue;
   direction.subVectors(point,camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());ray.far=Math.max(0,distance-.1);if(ray.intersectObjects(occluders,false).length)continue;
   const w=Math.min(206,width-16),h=42,x=Math.max(w/2+6,Math.min(width-w/2-6,(projected.x+1)*width/2)),y=Math.max(h/2+6,Math.min(height-h/2-6,(1-projected.y)*height/2));
   if(occupied.some(r=>Math.abs(x-r.x)<(w+r.w)/2&&Math.abs(y-r.y)<(h+r.h)/2))continue;occupied.push({x,y,w,h});
   button.hidden=false;button.classList.toggle('is-selected',label.code===selectedCode);button.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
  }
 },dispose(){layer.remove();}};
}
