import assert from 'node:assert/strict';
import * as THREE from 'three';
import {emptyProject,roomEdges,roomShapes,pointInRoom,newFloor} from '../src/model.ts';
import {doorGeometry} from '../src/doorGeometry.ts';
import {buildBuilding} from '../src/Building.ts';
import {floorElevation} from '../src/levelGeometry.ts';
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-5,msg);
for(const {value:shape} of roomShapes){
 const room={id:'host',name:'Host',kind:'living',color:'#eeeeee',shape,x:10,y:10,w:36,d:36};
 for(const edge of roomEdges(room))for(const swing of [1,-1]){
  const p=emptyProject();p.boundary=false;p.gate=false;p.roof='None';p.floors[0].rooms=[room];
  const o={id:'door',kind:'door',roomId:room.id,side:edge.side,offset:2,width:3,height:7,sill:0,swing};p.floors[0].openings=[o];
  const d=doorGeometry(room,o),{group,solids}=buildBuilding(p,true);group.updateMatrixWorld(true);
  const pivots=group.children.filter(m=>m.name==='Door hinge');assert.equal(pivots.length,1);
  const leaf=pivots[0].children[0],pivot=leaf.localToWorld(new THREE.Vector3(-d.width/2,-o.height/2,0)),tip=leaf.localToWorld(new THREE.Vector3(d.width/2,-o.height/2,0));
  near(pivot.x,d.hinge[0],'leaf starts at hinge');near(pivot.z,d.hinge[1]);near(tip.x,d.tip[0]);near(tip.z,d.tip[1]);
  near((tip.x-pivot.x)*d.tangent[0]+(tip.z-pivot.z)*d.tangent[1],0,'leaf is 90 degrees to wall');near(tip.distanceTo(pivot),2.9,'leaf fills opening with jamb clearance');
  assert.ok(pointInRoom(room,tip.x,tip.z),'door opens into host on every wall, including concave shapes');
  const bounds=new THREE.Box3().setFromObject(leaf);
  for(const wall of solids){const penetrationX=Math.min(bounds.max.x,wall.x+wall.w)-Math.max(bounds.min.x,wall.x),penetrationZ=Math.min(bounds.max.z,wall.z+wall.d)-Math.max(bounds.min.z,wall.z);assert.ok(penetrationX<1e-6||penetrationZ<1e-6,'door does not cross wall');}
  const opposite=doorGeometry(room,{...o,swing:-swing});assert.ok(Math.hypot(d.hinge[0]-opposite.hinge[0],d.hinge[1]-opposite.hinge[1])>2.8,'flip moves hinge to opposite jamb');
 }
}
const p=emptyProject();p.roof='None';p.boundary=false;const f=p.floors[0];f.rooms=[{id:'a',name:'A',kind:'living',color:'#eeeeee',x:5,y:5,w:20,d:20},{id:'b',name:'B',kind:'living',color:'#eeeeee',x:25,y:5,w:10,d:10},{id:'c',name:'C',kind:'living',color:'#eeeeee',x:25,y:15,w:10,d:10}];f.openings=[{id:'split',kind:'door',roomId:'a',side:1,offset:9,width:3,height:7,sill:0,swing:1}];
let {group}=buildBuilding(p);assert.equal(group.children.filter(m=>m.name==='Door hinge').length,1,'opening crossing split wall builds once');
const upper=newFloor('Upper');upper.rooms=[{...f.rooms[0],id:'up'}];upper.openings=[{...f.openings[0],id:'upper-door',roomId:'up',side:0,offset:3}];p.floors.push(upper);({group}=buildBuilding(p));const upperPivot=group.children.find(m=>m.userData.openingId==='upper-door');near(upperPivot.position.y,floorElevation(p,1),'hinge follows upper floor elevation');
console.log('PASS: 90-degree jamb-hinged doors, both swings, every shaped wall, no wall penetration, split-wall deduplication and upper-floor elevation.');
