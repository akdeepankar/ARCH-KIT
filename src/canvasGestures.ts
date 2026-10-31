type Pan={x:number;y:number};
type Setter<T>=(update:(previous:T)=>T)=>void;

// React may run state updaters after the input event has finished. Capture only
// numeric gesture values, never the event or its temporary currentTarget.
export function bindPlanWheel(canvas:SVGSVGElement,planWidth:number,setPan:Setter<Pan>,setZoom:Setter<number>){
 const wheel=(event:WheelEvent)=>{
  event.preventDefault();
  const viewportWidth=canvas.clientWidth,viewportHeight=canvas.clientHeight;
  const unit=event.deltaMode===1?16:event.deltaMode===2?viewportHeight:1;
  const deltaX=event.deltaX*unit,deltaY=event.deltaY*unit;
  if(!Number.isFinite(deltaX)||!Number.isFinite(deltaY)||!Number.isFinite(planWidth)||viewportWidth<=0||!Number.isFinite(viewportWidth))return;
  if(event.ctrlKey||event.metaKey){if(deltaY===0)return;const factor=deltaY>0?.9:1.1;setZoom(previous=>Math.min(4,Math.max(.35,previous*factor)));return;}
  const dx=deltaX*planWidth/viewportWidth,dy=deltaY*planWidth/viewportWidth;
  setPan(previous=>({x:previous.x+dx,y:previous.y+dy}));
 };
 // A non-passive listener keeps canvas gestures from scrolling/navigating the page.
 canvas.addEventListener('wheel',wheel,{passive:false});
 return()=>canvas.removeEventListener('wheel',wheel);
}
