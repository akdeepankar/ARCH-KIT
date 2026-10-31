import assert from 'node:assert/strict';
import * as THREE from 'three';
import {emptyProject,wallPoint} from '../src/model.ts';
import {convertExtraction} from '../server/ai/interpret.ts';
import {buildBuilding} from '../src/Building.ts';
const raw={isFloorPlan:true,summary:'Trace',interpretation:'reconstruction',uncertainties:[],dimensionNotes:[],plot:{width:40,depth:40,front:'North',setbacks:{front:0,rear:0,left:0,right:0}},floors:[{name:'Ground',height:10,rooms:[{name:'Living',kind:'living',x:10,y:10,width:16,depth:16,estimated:false}],openings:[],walls:[],stairs:[]}]};
for(const side of [0,1,2,3])for(const traceOffset of [0,.3]){
 const source=structuredClone(raw),f=source.floors[0],horizontal=side%2===0,line=side===0?10:26;f.openings=[{roomIndex:0,kind:'door',evidence:'door-symbol',side,offset:5,width:3,height:7,sill:0}];
 f.walls=[horizontal?{x:10,y:line+traceOffset,x2:26,y2:line+traceOffset,thickness:.5,height:10}:{x:line+traceOffset,y:10,x2:line+traceOffset,y2:26,thickness:.5,height:10}];
 const p=convertExtraction(source,emptyProject()).project;p.boundary=false;p.roof='None';const {group,solids}=buildBuilding(p);group.updateMatrixWorld(true);const room=p.floors[0].rooms[0],center=wallPoint(room,side,6.5),start=new THREE.Vector3(center[0]-(horizontal?0:2),5,center[1]-(horizontal?2:0)),direction=new THREE.Vector3(horizontal?0:1,0,horizontal?1:0);
 const ray=new THREE.Raycaster(start,direction,0,4);assert.equal(ray.intersectObject(group,true).length,0,'imported door is a true mesh opening through duplicate trace on side '+side);
 for(const t of [-.4,0,.4]){const x=center[0]+(horizontal?0:t),z=center[1]+(horizontal?t:0);assert.ok(!solids.some(s=>s.low<5&&s.high>5&&x>s.x-.25&&x<s.x+s.w+.25&&z>s.z-.25&&z<s.z+s.d+.25),'walk collision leaves door passage clear');}
 const lintel=new THREE.Raycaster(new THREE.Vector3(start.x,8,start.z),direction,0,4);assert.ok(lintel.intersectObject(group,true).length,'wall lintel remains above door');
 const beside=new THREE.Raycaster(new THREE.Vector3(start.x+(horizontal?4:0),5,start.z+(horizontal?0:4)),direction,0,4);assert.ok(beside.intersectObject(group,true).length,'wall beside passage remains');
}
// Nearby room outlines are a single thick shared-wall assembly, not a blocked second wall.
const source=structuredClone(raw);source.floors[0].rooms.push({name:'Bedroom',kind:'bedroom',x:26.3,y:10,width:10,depth:16,estimated:false});source.floors[0].openings=[{roomIndex:0,kind:'door',evidence:'door-symbol',side:1,offset:5,width:3,height:7,sill:0}];const p=convertExtraction(source,emptyProject()).project;p.boundary=false;p.roof='None';const {group}=buildBuilding(p);group.updateMatrixWorld(true);assert.equal(new THREE.Raycaster(new THREE.Vector3(24,5,16.5),new THREE.Vector3(1,0,0),0,4).intersectObject(group,true).length,0,'nearby traced room wall also has passage');
console.log('PASS: imported doorway mesh and walk passage on all four walls, duplicate traces, nearby outlines, intact lintels and jambs.');
