import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roofFootprints,signedArea} from '../src/roofGeometry.ts';
import {buildRoof} from '../src/Roof.ts';
const room=(x,y,w,d,extra={})=>({id:'r',name:'Room',color:'#ffffff',kind:'bedroom',x,y,w,d,...extra});
const area=fp=>fp.cells.reduce((n,c)=>n+c.w*c.d,0);
const joined=[room(0,0,10,10),room(10,0,10,10)];
let fp=roofFootprints(joined);assert.equal(fp.length,1);assert.deepEqual(fp[0].loops,[[[0,0],[20,0],[20,10],[0,10]]]);assert.equal(area(fp[0]),200);
const partial=[room(0,0,10,10),room(10,3,5,4)];fp=roofFootprints(partial);assert.equal(fp.length,1);assert.equal(fp[0].loops[0].length,8);assert.equal(area(fp[0]),120);
assert.equal(roofFootprints([room(0,0,10,10),room(10.5,0,10,10)]).length,2,'gaps stay open');
assert.equal(roofFootprints([room(0,0,10,10),room(10,10,10,10)]).length,2,'corner contact does not join roofs');
const l=[room(0,0,12,12,{shape:'l'})];fp=roofFootprints(l);assert.equal(area(fp[0]),108);assert.equal(fp[0].loops[0].length,6);
fp=roofFootprints([...l,room(6,6,6,6)]);assert.equal(fp[0].loops[0].length,4);assert.equal(area(fp[0]),144,'notch infill becomes one footprint');
const ring=[room(0,0,20,5),room(0,15,20,5),room(0,5,5,10),room(15,5,5,10),room(5,5,10,10,{kind:'courtyard'})];
fp=roofFootprints(ring);assert.equal(fp.length,1);assert.equal(fp[0].loops.length,2);assert.equal(fp[0].loops.filter(p=>signedArea(p)<0).length,1);assert.equal(area(fp[0]),300);
assert.deepEqual(roofFootprints([room(0,0,10,10,{kind:'courtyard'})]),[]);
const wall=new THREE.MeshStandardMaterial();
let roof=buildRoof(joined,'Flat / parapet',3,10,wall);assert.equal(roof.children.length,5,'one slab and four outer parapets');
roof=buildRoof(ring,'Flat / parapet',3,10,wall);assert.equal(roof.children.length,9,'one slab plus outer and courtyard parapets');
// The triangulated top must cover precisely the union, without covering holes.
for(const rooms of [joined,partial,l,ring]){
 const expected=roofFootprints(rooms).reduce((n,p)=>n+area(p),0);
 for(const type of ['Flat / parapet','Pitched roof']){
  roof=buildRoof(rooms,type,0,10,wall);let projectedArea=0;
  roof.updateMatrixWorld(true);
  for(const mesh of roof.children){const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry;const pos=g.getAttribute('position');
   for(let i=0;i<pos.count;i+=3){const p=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j).applyMatrix4(mesh.matrixWorld));const n=new THREE.Vector3().subVectors(p[1],p[0]).cross(new THREE.Vector3().subVectors(p[2],p[0]));if(n.y>1e-6)projectedArea+=n.y/2;}
  }
  assert.ok(Math.abs(projectedArea-expected)<1e-4,`${type}: exact top area ${projectedArea} vs ${expected}`);
 }
}
const underside=buildRoof(joined,'Pitched roof',0,10,wall);underside.updateMatrixWorld(true);assert.ok(new THREE.Raycaster(new THREE.Vector3(5,5,5),new THREE.Vector3(0,1,0)).intersectObject(underside,true).length,'pitched roof remains visible from inside');
console.log('PASS: joined, partial, detached, corner-touching, shaped, courtyard and flat/pitched mesh coverage.');

// Every level contributes its exposed roof, including when the new level is empty.
const {emptyProject,newFloor}=await import('../src/model.ts');
const {floorRoofCutouts,roofParapetEdges}=await import('../src/roofGeometry.ts');
const project=emptyProject(),ground=project.floors[0];ground.rooms=[room(0,0,20,10)];project.floors.push(newFloor('Level 1'));
assert.equal(roofFootprints(ground.rooms,floorRoofCutouts(project,0)).reduce((n,p)=>n+area(p),0),200,'empty upper level leaves the ground roof intact');
project.floors[1].rooms=[room(10,0,10,10)];
fp=roofFootprints(ground.rooms,floorRoofCutouts(project,0));assert.equal(fp.reduce((n,p)=>n+area(p),0),100,'upper-floor footprint replaces only the roof below it');
assert.equal(roofParapetEdges(fp[0].loops[0],floorRoofCutouts(project,0)).length,3,'no parapet runs through the upper-floor wall');
project.floors[1].rooms=[room(0,0,20,10)];assert.deepEqual(roofFootprints(ground.rooms,floorRoofCutouts(project,0)),[],'fully stacked floor has no overlapping intermediate roof');
project.floors[1].rooms=[room(5,2,10,6)];fp=roofFootprints(ground.rooms,floorRoofCutouts(project,0));assert.equal(fp.length,1);assert.equal(fp[0].loops.length,2);assert.equal(area(fp[0]),140,'surrounding lower roof remains continuous');
project.floors[1].rooms=[room(40,40,10,10)];assert.equal(roofFootprints(ground.rooms,floorRoofCutouts(project,0)).reduce((n,p)=>n+area(p),0),200,'detached upper footprint does not remove a lower roof');
project.floors[1].rooms=[room(0,0,10,10,{shape:'l'})];assert.equal(roofFootprints(ground.rooms,floorRoofCutouts(project,0)).reduce((n,p)=>n+area(p),0),125,'upper-floor shape cutouts retain the lower roof in their notches');
project.floors[1].rooms=[];ground.stairs=[{id:'stair',x:2,y:2,w:3,d:6,to:project.floors[1].id}];assert.equal(roofFootprints(ground.rooms,floorRoofCutouts(project,0)).reduce((n,p)=>n+area(p),0),182,'stair opening is not sealed by the intermediate roof');
const excludes=[{x:10,y:0,w:10,d:10}];
for(const type of ['Flat / parapet','Pitched roof']){
 const lower=buildRoof(ground.rooms,type,3,10,wall,excludes),upper=buildRoof([room(10,0,10,10)],type,3,20,wall);const building=new THREE.Group();building.add(lower,upper);building.updateMatrixWorld(true);
 const roofHeight=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,40,z),new THREE.Vector3(0,-1,0)).intersectObject(building,true)[0]?.point.y;
 assert.ok(roofHeight(5,5)>=10&&roofHeight(5,5)<=13.5,`${type} lower roof visible at its own elevation`);
 assert.ok(roofHeight(15,5)>=20,`${type} upper roof visible at its own elevation`);
 assert.equal(new THREE.Raycaster(new THREE.Vector3(15,15,5),new THREE.Vector3(0,-1,0)).intersectObject(lower,true).length,0,'lower roof does not protrude into upper rooms');
}
console.log('PASS: empty, full, partial, detached and shaped upper levels; intermediate roof elevations, parapet joins and open stairs.');
