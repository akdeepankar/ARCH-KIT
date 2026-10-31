import assert from 'node:assert/strict';
import {emptyProject,exampleProject,areas,unionArea,roomWalls,validate,presets,uid,openingsConflict,newFloor,applyProjectChange,RoomOverlapError,roomsOverlap} from '../src/model.ts';

const empty=emptyProject();
assert.equal(areas(empty).plot,1800);
assert.equal(areas(empty).envelope,1200);
assert.equal(areas(empty).net,0);
assert.equal(validate(empty)[0].severity,'info');

assert.equal(unionArea([{x:0,y:0,w:10,d:10},{x:5,y:0,w:10,d:10}]),150,'Overlaps count once');
const p=emptyProject(),f=p.floors[0];
const a={...presets[0],id:uid(),x:3,y:5,w:10,d:10};
const b={...presets[1],id:uid(),x:13,y:5,w:10,d:10};
f.rooms.push(a,b);
assert.equal(areas(p).net,200);
const walls=roomWalls(f);
assert.equal(walls.filter(w=>w.rooms.length===2).length,1,'Adjacent rooms share a single wall');
assert.equal(walls.reduce((sum,w)=>sum+w.length,0),70);
const oa={id:uid(),kind:'door',roomId:a.id,side:1,offset:2,width:3,height:7,sill:0,swing:1};
const ob={...oa,id:uid(),roomId:b.id,side:3};
assert.equal(openingsConflict(f,oa,ob),true,'Opposite hosts detect a physical opening conflict');
f.openings.push(oa,ob);
assert.ok(validate(p).some(v=>v.message==='Conflicting wall openings'));
f.openings.pop();
oa.offset=9;
assert.ok(validate(p).some(v=>v.message==='Invalid opening host or dimensions'));
oa.offset=2;
b.x=12;
assert.ok(validate(p).some(v=>v.message==='Rooms overlap'));
b.x=13;b.y=30;
assert.ok(validate(p).some(v=>v.message==='Disconnected room'));
b.x=0;
assert.ok(validate(p).some(v=>v.message==='Room crosses a setback'));

const ex=exampleProject();
assert.equal(areas(ex).net,916);
assert.equal(areas(ex).open,884);
assert.equal(validate(ex).filter(v=>v.severity==='error').length,0);
const upstairs=newFloor('First Floor');ex.floors.push(upstairs);
ex.floors[0].stairs.push({id:uid(),x:3,y:8,w:3.5,d:16,to:upstairs.id});
assert.equal(validate(ex).filter(v=>v.message==='Stair needs the next floor').length,0);
ex.floors[0].stairs[0].to='missing';
assert.ok(validate(ex).some(v=>v.message==='Stair needs the next floor'));
console.log('PASS: geometry areas, shared walls, hosted opening conflicts, overlaps, setbacks, examples, and stair connections.');

// Rejected commands leave the complete canonical model unchanged, including hosted openings.
const base=emptyProject(),ground=base.floors[0];
ground.rooms=[{...presets[0],id:uid(),x:3,y:8,w:10,d:10},{...presets[1],id:uid(),x:13,y:8,w:10,d:10}];
const original=JSON.stringify(base);
for(const change of [
 p=>p.floors[0].rooms.push({...presets[2],id:uid(),x:5,y:10}),
 p=>{p.floors[0].rooms[0].x=4},
 p=>{p.floors[0].rooms[0].w=11},
 p=>{p.floors[0].rooms.push({...p.floors[0].rooms[0],id:uid(),x:5})},
]){assert.throws(()=>applyProjectChange(base,change),RoomOverlapError);assert.equal(JSON.stringify(base),original)}
const edge=applyProjectChange(base,p=>{p.floors[0].rooms[0].w=9});
assert.equal(edge.floors[0].rooms[0].w,9);
assert.equal(roomsOverlap(ground.rooms[0],ground.rooms[1]),false,'A shared edge is permitted');
assert.equal(roomsOverlap(ground.rooms[0],{...ground.rooms[1],y:18}),false,'A shared corner is permitted');
assert.equal(roomsOverlap(ground.rooms[0],{...ground.rooms[1],x:12.999}),true,'Small overlaps are blocked');
const stacked=applyProjectChange(base,p=>{const upper=newFloor('Upper');upper.rooms=[{...ground.rooms[0],id:uid()}];p.floors.push(upper)});
assert.equal(stacked.floors.length,2,'Rooms on separate floors may stack');
const legacy=structuredClone(base);legacy.floors[0].rooms[1].x=12;
assert.doesNotThrow(()=>applyProjectChange(legacy,p=>{p.name='Repairing an older layout'}));
assert.doesNotThrow(()=>applyProjectChange(legacy,p=>{p.floors[0].rooms[1].x=13}));
console.log('PASS: overlapping add/move/resize/duplicate commands are atomic; shared boundaries and separate levels stay valid.');
