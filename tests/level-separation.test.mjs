import assert from 'node:assert/strict';
import * as THREE from 'three';
import {emptyProject,newFloor,uid} from '../src/model.ts';
import {buildBuilding} from '../src/Building.ts';
import {floorElevation,floorRise,FLOOR_SLAB_THICKNESS} from '../src/levelGeometry.ts';
const p=emptyProject(),ground=p.floors[0];ground.rooms=[{id:uid(),name:'Ground',x:3,y:5,w:20,d:24,color:'#ff0000',kind:'living'}];
const upper=newFloor('Level 1');upper.rooms=[{id:uid(),name:'Upper',x:7,y:13.5,w:14,d:16,color:'#00ff00',kind:'living'}];p.floors.push(upper);
assert.equal(floorElevation(p,0),0);assert.equal(floorElevation(p,1),10.3);
function inspect(cutaway=false){const {group,solids}=buildBuilding(p,cutaway);group.updateMatrixWorld(true);return {group,solids};}
for(const cutaway of [false,true]){
 const {group,solids}=inspect(cutaway);const slabs=group.children.filter(m=>m.name==='Floor slab'&&m.userData.floorId===upper.id);assert.ok(slabs.length);
 for(const slab of slabs){const b=new THREE.Box3().setFromObject(slab);assert.ok(Math.abs(b.min.y-ground.height)<1e-6,'upper slab begins at the ground ceiling, never below');assert.ok(Math.abs(b.max.y-floorElevation(p,1))<1e-6,'upper floor ends at the next room base');assert.equal(slab.material[2].color.getHexString(),'00ff00','room color is top face only');assert.equal(slab.material[3].color.getHexString(),'eeeae2','ground ceiling does not inherit upper room color');}
 const upperWalls=solids.filter(s=>s.low>0);assert.ok(upperWalls.length);assert.ok(upperWalls.every(s=>Math.abs(s.low-floorElevation(p,1))<1e-6),'upper walls begin on top of the slab');
 const hit=new THREE.Raycaster(new THREE.Vector3(10,5,20),new THREE.Vector3(0,1,0)).intersectObject(group,true)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-10)<1e-6,'ground room sees a ceiling at its full height');
}
ground.stairs=[{id:uid(),x:9,y:16,w:3.5,d:12,to:upper.id}];let {group}=inspect();const upperSlabs=group.children.filter(m=>m.name==='Floor slab'&&m.userData.floorId===upper.id);assert.equal(new THREE.Raycaster(new THREE.Vector3(10,9,20),new THREE.Vector3(0,1,0)).intersectObjects(upperSlabs,true).length,0,'floor slab leaves the stair opening clear');
const steps=group.children.filter(m=>m.name==='Stair tread');assert.equal(steps.length,Math.ceil(floorRise(ground)/(7/12)));assert.ok(Math.abs(Math.max(...steps.map(m=>new THREE.Box3().setFromObject(m).max.y))-floorElevation(p,1))<1e-6,'stairs land exactly on the upper floor');
ground.height=12;upper.height=9;p.floors.push(newFloor('Level 2'));assert.equal(floorElevation(p,1),12.3);assert.equal(floorElevation(p,2),21.6);({group}=inspect());const shifted=group.children.find(m=>m.name==='Floor slab'&&m.userData.floorId===upper.id);assert.ok(Math.abs(new THREE.Box3().setFromObject(shifted).min.y-12)<1e-6,'changing height moves the whole floor assembly');
assert.equal(FLOOR_SLAB_THICKNESS,.3);console.log('PASS: actual building meshes keep upper rooms above lower ceilings, separate floor/ceiling paint, open stairs and align treads after height changes.');
