import assert from 'node:assert/strict';
import {bindPlanWheel} from '../src/canvasGestures.ts';
class Canvas extends EventTarget{clientWidth=500;clientHeight=400;options;addEventListener(type,listener,options){this.options=options;super.addEventListener(type,listener,options);}}
const canvas=new Canvas(),panQueue=[],zoomQueue=[];const cleanup=bindPlanWheel(canvas,100,update=>panQueue.push(update),update=>zoomQueue.push(update));assert.equal(canvas.options.passive,false);
function gesture(values){const e=new Event('wheel',{cancelable:true});Object.assign(e,{deltaX:0,deltaY:0,deltaMode:0,ctrlKey:false,metaKey:false,...values});canvas.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(e.currentTarget,null,'event target is cleared before queued state updates run');return e;}
let pan={x:0,y:0};
// React's deferred/Strict Mode execution happens after dispatch: no live event target exists.
for(let i=0;i<30;i++)gesture({deltaY:-10,deltaX:2});for(const update of panQueue){const result=update(pan);assert.deepEqual(update(pan),result,'queued updater is pure if React retries it');pan=result;}panQueue.length=0;assert.deepEqual(pan,{x:12.000000000000005,y:-60});
gesture({deltaY:100});pan=panQueue.shift()(pan);assert.equal(pan.y,-40,'opposite swipe pans back without crashing');
gesture({deltaY:2,deltaMode:1});assert.equal(panQueue.shift()({x:0,y:0}).y,6.4,'line wheel units normalize');gesture({deltaY:1,deltaMode:2});assert.equal(panQueue.shift()({x:0,y:0}).y,80,'page wheel units normalize');
gesture({ctrlKey:true,deltaY:-5});assert.equal(zoomQueue.shift()(1),1.1);gesture({metaKey:true,deltaY:5});assert.equal(zoomQueue.shift()(1),.9);gesture({ctrlKey:true,deltaY:-1});assert.equal(zoomQueue.shift()(4),4);gesture({ctrlKey:true,deltaY:1});assert.equal(zoomQueue.shift()(.35),.35);
for(const values of [{deltaY:NaN},{deltaX:Infinity},{deltaY:1,ctrlKey:true,deltaX:NaN}])gesture(values);assert.equal(panQueue.length,0);assert.equal(zoomQueue.length,0);canvas.clientWidth=0;gesture({deltaY:1});assert.equal(panQueue.length,0,'hidden canvas cannot corrupt pan with divide-by-zero');canvas.clientWidth=500;cleanup();const after=new Event('wheel',{cancelable:true});Object.assign(after,{deltaY:100});canvas.dispatchEvent(after);assert.equal(after.defaultPrevented,false);assert.equal(panQueue.length,0,'listener is removed on view change');
console.log('PASS: delayed swipe updates after event target is cleared, repeated swipes, pinch zoom, input units, non-passive cancellation, invalid dimensions and listener cleanup.');
