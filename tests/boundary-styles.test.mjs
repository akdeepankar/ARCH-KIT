import assert from 'node:assert/strict';
import * as THREE from 'three';
import {emptyProject,validProject} from '../src/model.ts';
import {buildBoundary,boundaryStyles,gateStyles,boundaryLayout} from '../src/boundaryGeometry.ts';
import {executeStudioTool} from '../src/studioActions.ts';
import {facadeMaterial,finishProfiles} from '../src/facadeMaterials.ts';
for(const finish of Object.keys(finishProfiles)){const material=facadeMaterial(finish,'#abcdef');assert.equal(material.map,null);assert.equal(material.color.getHexString(),'abcdef');}
let p=executeStudioTool(emptyProject(),'update_project_settings',{patch:{boundary:true,gate:true,boundaryStyle:'Wall + railing',gateStyle:'Rod gate',boundaryColor:'#d8d0bc',gateColor:'#283a30',gateHeight:5,rodSpacing:.4}});
for(const style of boundaryStyles)for(const gate of gateStyles){p.boundaryStyle=style;p.gateStyle=gate;const {group,solids}=buildBoundary(p);group.updateMatrixWorld(true);const meshes=[];group.traverse(o=>{if(o.isMesh)meshes.push(o)});assert.ok(meshes.length);assert.ok(solids.some(s=>s.high===5),'closed gate blocks walking');const gateFrame=group.children.find(g=>g.name==='Boundary North');if(gate==='Rod gate')assert.ok(gateFrame.children.filter(m=>m.name==='Vertical rod').length>4);if(gate==='Arched rod gate')assert.ok(gateFrame.children.some(m=>m.name==='Arched gate rail'));if(gate==='Solid panel gate')assert.ok(gateFrame.children.some(m=>m.name==='Solid gate panel'));assert.ok(meshes.some(m=>m.material.color.getHexString()==='283a30'));const bounds=new THREE.Box3().setFromObject(group);assert.ok(bounds.max.y<=6.21);assert.ok(Number.isFinite(bounds.max.x));}
for(const front of ['North','East','South','West']){p.plot.front=front;const layout=boundaryLayout(p);assert.equal(layout.filter(s=>s.gate).length,1);assert.equal(layout.find(s=>s.gate).name,front);const {group}=buildBoundary(p);assert.ok(group.children.find(g=>g.name==='Boundary '+front).children.some(m=>m.name==='Arched gate rail'));}
p=executeStudioTool(p,'update_project_settings',{patch:{plot:{front:'East'},gateWidth:40}});assert.equal(p.gateWidth,40,'gate fits the longer east boundary');assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{gateWidth:70}}),/selected boundary wall/);assert.ok(validProject(JSON.parse(JSON.stringify(p))));assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{rodSpacing:.01}}));assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{gateStyle:'unknown'}}));
p.boundary=false;assert.equal(buildBoundary(p).group.children.length,0);p.boundary=true;p.gate=false;assert.ok(boundaryLayout(p).every(s=>!s.gate));assert.ok(buildBoundary(p).group.children.every(g=>!g.children.some(m=>m.name==='Arched gate rail')));
console.log('PASS: plain finishes, 16 boundary/gate combinations, rod/arched geometry, colors, dimensions, all four frontages, collision and persistence.');
// Side selection is independent of the plot front. Position runs consistently
// west-to-east on horizontal walls and north-to-south on vertical walls.
p=executeStudioTool(emptyProject(),'update_project_settings',{patch:{boundary:true,gate:true,gateWidth:10,gateStyle:'Rod gate'}});
for(const side of ['North','East','South','West'])for(const position of [0,.2,.5,1]){
 const moved=executeStudioTool(p,'update_project_settings',{patch:{gateSide:side,gatePosition:position}}),layout=boundaryLayout(moved),segment=layout.find(s=>s.gate);
 assert.equal(segment.name,side);assert.ok(segment.gateStart>=0&&segment.gateEnd<=segment.length);assert.equal(layout.filter(s=>s.gate).length,1);
 const {group,solids}=buildBoundary(moved);group.updateMatrixWorld(true);const frame=group.children.find(g=>g.name==='Boundary '+side),stile=frame.children.find(m=>m.name==='Gate meeting stile');const center=stile.getWorldPosition(new THREE.Vector3()),horizontal=side==='North'||side==='South',expected=(segment.length-10)*position+5;
 assert.ok(Math.abs((horizontal?center.x:center.z)-expected)<1e-6,`${side} position ${position} places the actual mesh at the requested world coordinate`);
 assert.ok(solids.some(s=>s.high===4),'gate collision follows its mesh');assert.ok(validProject(JSON.parse(JSON.stringify(moved))));
}
p=executeStudioTool(p,'update_project_settings',{patch:{gateSide:'West',gatePosition:.25,plot:{front:'East'}}});assert.equal(boundaryLayout(p).find(s=>s.gate).name,'West','explicit side does not change site frontage');assert.equal(p.plot.front,'East');
p=executeStudioTool(p,'update_project_settings',{patch:{gateSide:'Front'}});assert.equal(boundaryLayout(p).find(s=>s.gate).name,'East');
p=executeStudioTool(p,'update_project_settings',{patch:{gateWidth:60,gatePosition:1}});assert.equal(boundaryLayout(p).find(s=>s.gate).gateStart,0,'full-width gate cannot travel past corners');
assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{gateSide:'North'}}),/selected boundary wall/);assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{gatePosition:1.1}}));assert.throws(()=>executeStudioTool(p,'update_project_settings',{patch:{gateSide:'Diagonal'}}));
console.log('PASS: gate movement on all four walls, mesh and plan positions, frontage independence, full-width limits, persistence and invalid-position rejection.');
