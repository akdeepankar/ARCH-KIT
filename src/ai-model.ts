import type {Project,Room} from './model.ts';
import {applyProjectChange,floorOf,presets,roomsOverlap,uid,sideLength,roomRects,roomShapes,isColor} from './model.ts';

export type RoomEdit={action:'add'|'update'|'delete'|'duplicate';floorId?:string;shape?:Room['shape'];color?:string;id?:string;name?:string;kind?:string;x?:number;y?:number;width?:number;depth?:number;beside?:string;side?:'north'|'south'|'east'|'west'};
const fields=new Set(['action','id','name','kind','x','y','width','depth','beside','side','floorId','shape','color']);
export function executeRoomEdits(project:Project,edits:RoomEdit[]):Project{
 if(!Array.isArray(edits)||!edits.length||edits.length>60)throw Error('Provide between 1 and 60 room edits.');
 return applyProjectChange(project,p=>{
  const changed=new Set<string>();
  for(const edit of edits){
   if(!edit||typeof edit!=='object'||Object.keys(edit).some(k=>!fields.has(k)))throw Error('Unsupported room-edit fields.');
   for(const key of ['id','floorId','beside'] as const)if(edit[key]!==undefined&&(typeof edit[key]!=='string'||!edit[key]!.trim()||edit[key]!.length>100))throw Error('Use non-empty IDs from the current project.');
   if(edit.side!==undefined&&!['north','south','east','west'].includes(edit.side))throw Error('Unknown adjacency side.');
   const f=edit.floorId?p.floors.find(f=>f.id===edit.floorId):floorOf(p);if(!f)throw Error('Floor ID not found.');
   if(edit.shape!==undefined&&!roomShapes.some(s=>s.value===edit.shape))throw Error('Unknown room footprint.');
   if(edit.color!==undefined&&!isColor(edit.color))throw Error('Use a six-digit hex color.');
   if(!['add','update','delete','duplicate'].includes(edit.action))throw Error('Unsupported room action.');
   for(const k of ['x','y','width','depth'] as const)if(edit[k]!==undefined&&(!Number.isFinite(edit[k])||Math.abs(edit[k]!)>500))throw Error('Coordinates and dimensions must be finite feet.');
   if(edit.name!==undefined&&(typeof edit.name!=='string'||!edit.name.trim()||edit.name.length>60))throw Error('Room names must have 1–60 characters.');
   let room=f.rooms.find(r=>r.id===edit.id);
   if(edit.action==='delete'){
    if(!room)throw Error('Room ID not found. Inspect the project and use an existing ID.');
    f.rooms=f.rooms.filter(r=>r.id!==room!.id);f.openings=f.openings.filter(o=>o.roomId!==room!.id);f.exteriors=f.exteriors.filter(e=>e.roomId!==room!.id);continue;
   }
   if((edit.action==='update'||edit.action==='duplicate')&&!room)throw Error('Room ID not found. Inspect the project and use an existing ID.');
   if(edit.action==='duplicate'){const source=room!;room={...structuredClone(source),id:uid(),name:(source.name+' copy').slice(0,60)};f.openings.push(...f.openings.filter(o=>o.roomId===source.id).map(o=>({...o,id:uid(),roomId:room!.id})));}
   if(edit.action==='add'){
    if(f.rooms.length>=100)throw Error('This planning request supports up to 100 rooms on a floor.');
    const pr=presets.find(r=>r.kind===edit.kind)||presets.find(r=>r.name.toLowerCase()===edit.name?.toLowerCase())||presets[9];
    room={...pr,id:uid(),x:0,y:0};
   }
   room=room!;
   if(edit.name!==undefined)room.name=edit.name.trim();
   if(edit.kind!==undefined){const pr=presets.find(r=>r.kind===edit.kind);if(!pr)throw Error('Unknown room kind.');room.kind=pr.kind;room.color=pr.color;}
   if(edit.shape!==undefined&&edit.shape!==(room.shape||'rectangle')){if(f.openings.some(o=>o.roomId===room!.id))throw Error('Remove hosted openings before changing the footprint.');room.shape=edit.shape;delete room.wallColors;delete room.exteriorColors;}
   if(edit.color!==undefined)room.color=edit.color;
   if(edit.width!==undefined)room.w=edit.width;if(edit.depth!==undefined)room.d=edit.depth;
   if(room.w<2||room.d<2)throw Error('Room dimensions must be at least 2 ft.');
   if(edit.beside){
    const target=f.rooms.find(r=>r.id===edit.beside);if(!target||target.id===room.id)throw Error('Adjacent room ID not found.');
    const side=edit.side||'east';if(!['north','south','east','west'].includes(side))throw Error('Unknown adjacency side.');
    room.x=side==='east'?target.x+target.w:side==='west'?target.x-room.w:target.x;
    room.y=side==='south'?target.y+target.d:side==='north'?target.y-room.d:target.y;
   }else if((edit.action==='add'||edit.action==='duplicate')&&edit.x===undefined&&edit.y===undefined){
    const pos=findFreePosition({...p,active:f.id},room);if(!pos)throw Error(`No free space fits ${room.name} (${room.w} × ${room.d} ft) inside the setbacks. Revise the layout or ask the user about smaller dimensions.`);Object.assign(room,pos);
   }else{if(edit.x!==undefined)room.x=edit.x;if(edit.y!==undefined)room.y=edit.y;if((edit.action==='add'||edit.action==='duplicate')&&(edit.x===undefined||edit.y===undefined))throw Error('Provide both x and y, or omit both for automatic placement.');}
   if(edit.action==='add'||edit.action==='duplicate')f.rooms.push(room);
   changed.add(room.id);
   for(const o of f.openings.filter(o=>o.roomId===room.id)){
    if(o.width>sideLength(room,o.side))throw Error('The room is too small for its hosted openings.');
    o.offset=Math.max(0,Math.min(o.offset,sideLength(room,o.side)-o.width));
   }
  }
  const s=p.plot.setbacks;
  for(const f of p.floors)for(const r of f.rooms.filter(r=>changed.has(r.id))){if(r.x<s.left-1e-7||r.y<s.front-1e-7||r.x+r.w>p.plot.w-s.right+1e-7||r.y+r.d>p.plot.d-s.rear+1e-7)throw Error(`${r.name} crosses the buildable envelope. Keep every edited room within the site setbacks.`);}
 });
}
function findFreePosition(p:Project,room:Room){
 const f=floorOf(p),s=p.plot.setbacks,right=p.plot.w-s.right-room.w,bottom=p.plot.d-s.rear-room.d;
 const xs=[...new Set([s.left,right,...f.rooms.flatMap(roomRects).flatMap(r=>[r.x,r.x+r.w,r.x-room.w])])].filter(x=>x>=s.left&&x<=right).sort((a,b)=>a-b);
 const ys=[...new Set([s.front,bottom,...f.rooms.flatMap(roomRects).flatMap(r=>[r.y,r.y+r.d,r.y-room.d])])].filter(y=>y>=s.front&&y<=bottom).sort((a,b)=>a-b);
 for(const y of ys)for(const x of xs)if(!f.rooms.some(r=>roomsOverlap({...room,x,y},r)))return{x,y};
 return null;
}

export const editTool={type:'function',name:'apply_room_edits',description:'Add, update/move/resize, duplicate (with hosted openings), or delete rooms in an atomic batch of room edits on a specified floor or the active floor. Use feet for coordinates and dimensions. Add rooms without x/y for automatic placement within setbacks, or beside an existing room with a direction. All edits in a batch are validated together; overlaps and setback violations are rejected. Read returned room IDs before subsequent edits.',parameters:{type:'object',properties:{edits:{type:'array',minItems:1,maxItems:60,items:{type:'object',properties:{action:{type:'string',enum:['add','update','delete','duplicate']},id:{type:'string',description:'Existing room ID for update/delete.'},floorId:{type:'string',description:'Target floor ID; defaults to active floor.'},shape:{type:'string',enum:roomShapes.map(s=>s.value)},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$',description:'Room floor/plan fill color, not wall paint.'},name:{type:'string'},kind:{type:'string',enum:presets.map(r=>r.kind)},width:{type:'number',minimum:2},depth:{type:'number',minimum:2},x:{type:'number'},y:{type:'number'},beside:{type:'string',description:'Existing room ID to place adjacent to.'},side:{type:'string',enum:['north','south','east','west']}},required:['action'],additionalProperties:false}}},required:['edits'],additionalProperties:false}};
