import assert from 'node:assert/strict';
import {convertExtraction,applyAppearance,appearanceSchema} from '../server/ai/interpret.ts';
import {emptyProject,validate,applyProjectChange} from '../src/model.ts';
const project=emptyProject(),original=JSON.stringify(project);
const raw={isFloorPlan:true,summary:'Recognized sketch with estimated dimensions.',interpretation:'reconstruction',uncertainties:['Scale is estimated.'],dimensionNotes:['Living room dimensions were read from the source.'],plot:{width:30,depth:40,front:'North',setbacks:{front:3,rear:3,left:3,right:3}},floors:[{name:'Ground Floor',height:10,rooms:[{name:'Living',kind:'living',x:3,y:3,width:12,depth:14,estimated:false},{name:'Bedroom',kind:'bedroom',x:15,y:3,width:12,depth:14,estimated:true}],openings:[{roomIndex:0,kind:'door',evidence:'door-symbol',side:0,offset:3,width:3,height:7,sill:0},{roomIndex:1,kind:'window',evidence:'window-symbol',side:1,offset:2,width:4,height:4,sill:3}],walls:[],stairs:[]}]};
const proposal=convertExtraction(raw,project);assert.equal(proposal.project.floors[0].rooms.length,2);assert.equal(proposal.project.floors[0].openings[1].roomId,proposal.project.floors[0].rooms[1].id);assert.equal(proposal.estimatedRoomIds.length,1);assert.equal(validate(proposal.project).filter(f=>f.severity==='error').length,0);assert.equal(JSON.stringify(project),original);
const bad=structuredClone(raw);bad.floors[0].rooms[1].x=4;const overlap=convertExtraction(bad,project);assert.throws(()=>applyProjectChange(project,p=>Object.assign(p,overlap.project)),/overlap/);
const invalidHost=structuredClone(raw);invalidHost.floors[0].openings[0].roomIndex=9;assert.throws(()=>convertExtraction(invalidHost,project),/host/);
const nonsense=structuredClone(raw);nonsense.floors[0].rooms[0].width=-2;assert.throws(()=>convertExtraction(nonsense,project));
const result=applyAppearance(project,{roof:'Pitched roof',finish:'Brick & stone',parapet:2});assert.deepEqual(result.floors,project.floors);assert.deepEqual(result.plot,project.plot);assert.equal(result.roof,'Pitched roof');assert.throws(()=>appearanceSchema.parse({summary:'bad',patch:{floors:[]},unsupported:[]}));assert.throws(()=>applyAppearance(project,{finish:'arbitrary material'}));
console.log('PASS: image extraction builds editable hosted geometry, tracks estimates, blocks overlaps on import, rejects invalid dimensions/hosts, and constrains 3D changes to supported appearance.');

// Imported shapes and hinges must survive extraction instead of becoming rectangles/default swings.
const shaped=structuredClone(raw);shaped.floors[0].rooms[0].shape='l';shaped.floors[0].openings[0].side=5;shaped.floors[0].openings[0].swing=-1;
const shapedPlan=convertExtraction(shaped,project).project;assert.equal(shapedPlan.floors[0].rooms[0].shape,'l');assert.equal(shapedPlan.floors[0].openings[0].side,5);assert.equal(shapedPlan.floors[0].openings[0].swing,-1);
for(const rejection of [{isFloorPlan:false,reason:'A photo'}, {...raw,isFloorPlan:false},{...raw,interpretation:'conceptual interpretation'},{}])assert.throws(()=>convertExtraction(rejection,project),/upload a proper floor plan/);
const oversized=structuredClone(raw);oversized.floors[0].openings[0].offset=11;assert.throws(()=>convertExtraction(oversized,project),/does not fit/);
const duplicate=structuredClone(raw);duplicate.floors[0].openings=[{roomIndex:0,kind:'door',evidence:'door-symbol',side:1,offset:4,width:3,height:7,sill:0},{roomIndex:1,kind:'door',evidence:'door-symbol',side:3,offset:4,width:3,height:7,sill:0}];assert.equal(convertExtraction(duplicate,project).project.floors[0].openings.length,1,'same shared door gets one host');
const {interpretPlan}=await import('../server/ai/interpret.ts');
let seen;
const mock=output=>async(url,opts)=>{seen=JSON.parse(opts.body);return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]});};
await assert.rejects(()=>interpretPlan('test',project,'Convert image',['data:image/png;base64,test'],undefined,mock({isFloorPlan:false})),/upload a proper floor plan/);
assert.match(seen.instructions,/NOT floor plans/);assert.equal(seen.reasoning.effort,'medium');assert.equal(seen.store,false);
const interpreted=await interpretPlan('test',project,'Match my plan',['data:image/png;base64,test'],{points:[{x:0,y:0},{x:1,y:0}],feet:30,imageWidth:1200,imageHeight:1600},mock(raw));assert.equal(interpreted.project.floors[0].rooms[0].w,12);assert.match(seen.input[0].content[0].text,/calibration/);
assert.equal(JSON.stringify(project),original,'rejected and valid proposals never mutate current project');
console.log('PASS: floor-plan-only rejection, shape/hinge preservation, exact shared-door deduplication, opening fit guards and actual model request contract.');
