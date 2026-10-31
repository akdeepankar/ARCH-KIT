export type ImageSize={width:number;height:number};
export type SourceBox={left:number;top:number;right:number;bottom:number};
export type TraceCalibration={points:{x:number;y:number}[];feet:number;imageWidth:number;imageHeight:number};
export function imageSize(dataUrl:string):ImageSize|undefined{
 try{const bytes=Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',')+1)),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
 if(bytes[0]===137&&bytes[1]===80&&bytes.length>=24)return{width:view.getUint32(16),height:view.getUint32(20)};
 if(bytes[0]===255&&bytes[1]===216){let i=2;while(i+8<bytes.length){if(bytes[i++]!==255)continue;let marker=bytes[i++];while(marker===255)marker=bytes[i++];if(marker===217||marker===218)break;if(marker===216||marker===1||marker>=208&&marker<=215)continue;const length=view.getUint16(i);if(length<2||i+length>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{width:view.getUint16(i+5),height:view.getUint16(i+3)};i+=length;}}
 }catch{/* Missing dimensions leave the reviewed metric extraction available. */}
}
// One scale per source drawing retains unequal widths, offsets and corridor proportions.
export function traceFloor<T extends {rooms:{x:number;y:number;width:number;depth:number;estimated:boolean;sourceBox?:SourceBox}[];sourceImageIndex?:number}>(floor:T,size:ImageSize,calibration?:TraceCalibration){
 if(!floor.rooms.length||floor.rooms.some(r=>!r.sourceBox))return undefined;
 const rooms=floor.rooms,boxes=rooms.map(r=>r.sourceBox!),minLeft=Math.min(...boxes.map(b=>b.left)),minTop=Math.min(...boxes.map(b=>b.top)),originX=Math.min(...rooms.map(r=>r.x)),originY=Math.min(...rooms.map(r=>r.y));
 const measured=rooms.filter(r=>!r.estimated),anchors=measured.length?measured:rooms;
 const ratios=anchors.flatMap(r=>[r.width/((r.sourceBox!.right-r.sourceBox!.left)*size.width),r.depth/((r.sourceBox!.bottom-r.sourceBox!.top)*size.height)]).sort((a,b)=>a-b);
 let scale=ratios.length%2?ratios[(ratios.length-1)/2]:(ratios[ratios.length/2-1]+ratios[ratios.length/2])/2;
 if(calibration){const [a,b]=calibration.points,normalizedLength=Math.hypot((b.x-a.x)*calibration.imageWidth,(b.y-a.y)*calibration.imageHeight);if(normalizedLength<1)throw Error('Choose two different calibration endpoints.');scale=calibration.feet/normalizedLength*(calibration.imageWidth/size.width);}
 if(!Number.isFinite(scale)||scale<=0)throw Error('Image scale could not be resolved. Calibrate a known distance and retry.');
 return rooms.map(r=>{const b=r.sourceBox!;return{x:originX+(b.left-minLeft)*size.width*scale,y:originY+(b.top-minTop)*size.height*scale,width:(b.right-b.left)*size.width*scale,depth:(b.bottom-b.top)*size.height*scale};});
}
