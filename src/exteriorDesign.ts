import {roomEdges,pointInRoom,roomWalls} from './model.ts';
import type {Exterior,Floor} from './model.ts';
export const facadeFinishes=['Mineral stucco','Brick masonry','Exposed concrete','Timber cladding','Metal panel'] as const;
export const legacyFinishes=['Warm white & timber','Light matte render','Concrete & charcoal','Brick & stone','Contemporary neutral'] as const;
export const allFinishes=[...facadeFinishes,...legacyFinishes] as const;
export const exteriorKinds=['Terrace','Balcony','Canopy','Frame','Sunshade'] as const;
export const exteriorVariants=['standard','glass','timber','juliet','pergola','pitched','box','vertical','louvered'] as const;
export const exteriorPresets=[
 {kind:'Terrace',hint:'Click the plan · slab + railing',options:[['standard','Open terrace'],['glass','Glass railing'],['timber','Timber deck']]},
 {kind:'Balcony',hint:'Click the plan · projecting slab',options:[['standard','Slim balcony'],['glass','Glass balcony'],['juliet','Juliette balcony']]},
 {kind:'Canopy',hint:'Click an exterior wall',options:[['standard','Flat canopy'],['pergola','Pergola canopy'],['pitched','Pitched canopy']]},
 {kind:'Frame',hint:'Click an exterior wall',options:[['standard','Portal frame'],['box','Box frame'],['timber','Timber frame']]},
 {kind:'Sunshade',hint:'Click an exterior wall',options:[['standard','Horizontal fins'],['vertical','Vertical fins'],['louvered','Brise soleil']]}
] as const;
export const isHostedKind=(kind:string)=>['Canopy','Frame','Sunshade'].includes(kind);
export function exteriorPlacement(floor:Floor,item:Exterior):Exterior{
 if(!item.roomId)return item;const room=floor.rooms.find(r=>r.id===item.roomId),edge=room&&roomEdges(room).find(e=>e.side===item.side);
 if(!room||!edge)throw Error('Exterior feature host wall no longer exists.');
 const horizontal=edge.y===edge.y2,length=horizontal?edge.x2-edge.x:edge.y2-edge.y,width=Math.min(item.width??(horizontal?item.w:item.d),length),depth=item.projection??(horizontal?item.d:item.w),offset=Math.min(Math.max(0,item.offset||0),Math.max(0,length-width));
 const x=horizontal?edge.x+offset:edge.x,y=horizontal?edge.y:edge.y+offset,positive=!pointInRoom(room,horizontal?x+width/2:x+.01,horizontal?y+.01:y+width/2);
 return {...item,x:horizontal?x:x+(positive?0:-depth),y:horizontal?y+(positive?0:-depth):y,w:horizontal?width:depth,d:horizontal?depth:width,width,projection:depth,offset};
}
export function validateExteriorHost(floor:Floor,item:Exterior){
 if(!item.roomId)return;const placed=exteriorPlacement(floor,item),room=floor.rooms.find(r=>r.id===item.roomId)!,edge=roomEdges(room).find(e=>e.side===item.side)!,horizontal=edge.y===edge.y2;
 if(!isHostedKind(item.kind)||room.kind==='courtyard')throw Error('Canopies, frames and sunshades need an enclosed room exterior wall.');
 const start=(horizontal?placed.x:placed.y),end=start+(placed.width||0);
 const shared=roomWalls(floor).some(s=>s.rooms.length>1&&s.rooms.includes(room.id)&&(horizontal?s.y===edge.y&&s.y2===edge.y&&s.x<end-1e-7&&s.x2>start+1e-7:s.x===edge.x&&s.x2===edge.x&&s.y<end-1e-7&&s.y2>start+1e-7));
 if(shared)throw Error('Choose an exposed exterior wall, not a wall shared by two rooms.');
}
export function exteriorAtPoint(floor:Floor,kind:string,variant:string,x:number,y:number):Omit<Exterior,'id'>{
 if(!isHostedKind(kind))return {kind,variant,x,y,w:10,d:kind==='Terrace'?8:variant==='juliet'?.8:4};
 let best:{roomId:string;side:number;offset:number;width:number;distance:number}|undefined;
 for(const room of floor.rooms.filter(r=>r.kind!=='courtyard'))for(const edge of roomEdges(room)){
  const horizontal=edge.y===edge.y2,length=horizontal?edge.x2-edge.x:edge.y2-edge.y,width=Math.min(kind==='Frame'?5:10,length),offset=Math.max(0,Math.min(length-width,(horizontal?x-edge.x:y-edge.y)-width/2));
  const px=horizontal?Math.max(edge.x,Math.min(edge.x2,x)):edge.x,py=horizontal?edge.y:Math.max(edge.y,Math.min(edge.y2,y)),distance=Math.hypot(x-px,y-py);
  const candidate={kind,variant,roomId:room.id,side:edge.side,offset,width,projection:kind==='Frame'?.6:kind==='Sunshade'?2:4,x:0,y:0,w:width,d:4} as Exterior;
  try{validateExteriorHost(floor,candidate);if(!best||distance<best.distance)best={roomId:room.id,side:edge.side,offset,width,distance}}catch{}
 }
 if(!best||best.distance>2)throw Error('Click an exposed exterior wall to attach this feature.');
 return exteriorPlacement(floor,{id:'placement',kind,variant,...best,projection:kind==='Frame'?.6:kind==='Sunshade'?2:4,x:0,y:0,w:best.width,d:4});
}
