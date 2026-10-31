import {exteriorPresets,facadeFinishes,exteriorKinds,exteriorVariants,exteriorPlacement,validateExteriorHost} from './exteriorDesign.ts';
import {finishTool,executeFinishEdits} from './finishActions.ts';
import {z} from 'zod';
import {projectWallLabels,resolveWallLabel} from './wallLabels.ts';
import {editorMutationTools,editorExecutors} from './editorActions.ts';
import {applyProjectChange,newFloor,floorOf,uid,roomEdges,roomWallName,presets,roomShapes,areas,validate} from './model.ts';
import type {Project,Floor} from './model.ts';
import {executeRoomEdits,editTool} from './ai-model.ts';
const id=z.string().min(1).max(100),name=z.string().trim().min(1).max(60),hex=z.string().regex(/^#[0-9a-fA-F]{6}$/),color=hex.nullable();
const batch=<T extends z.ZodTypeAny>(item:T)=>z.object({edits:z.array(item).min(1).max(60)}).strict();
const floorEdit=z.object({action:z.enum(['add','update','delete','select','duplicate']),id:id.optional(),name:name.optional(),height:z.number().min(7).max(30).optional()}).strict();
const surfaceEdit=z.object({target:z.enum(['interior','exterior','room-wall','room-exterior','room-floor','wall','exterior-feature','labeled-wall']),wallLabel:z.string().min(1).max(500).optional(),floorId:id.optional(),roomId:id.optional(),id:id.optional(),side:z.number().int().min(0).max(11).optional(),color}).strict();
const exteriorEdit=z.object({action:z.enum(['add','update','delete','duplicate']),floorId:id.optional(),id:id.optional(),kind:z.enum(exteriorKinds).optional(),variant:z.enum(exteriorVariants).optional(),roomId:id.optional(),side:z.number().int().min(0).max(11).optional(),offset:z.number().min(0).optional(),x:z.number().finite().optional(),y:z.number().finite().optional(),width:z.number().positive().max(300).optional(),depth:z.number().positive().max(500).optional(),color:color.optional()}).strict();
const floor=(p:Project,id?:string):Floor=>{const f=id?p.floors.find(f=>f.id===id):floorOf(p);if(!f)throw Error('Floor ID not found. Inspect the project first.');return f};
export function executeFloorEdits(project:Project,input:unknown){const {edits}=batch(floorEdit).parse(input);return applyProjectChange(project,p=>{
 for(const e of edits){
  if(e.action==='add'){const f=newFloor(e.name||'Level '+p.floors.length);if(e.height!==undefined)f.height=e.height;p.floors.push(f);p.active=f.id;continue;}
  if(!e.id)throw Error('An existing floor ID is required.');const f=floor(p,e.id);
  if(e.action==='select'){p.active=f.id;continue;}
  if(e.action==='delete'){if(p.floors.length===1)throw Error('Keep at least one floor.');p.floors=p.floors.filter(l=>l.id!==f.id);if(p.active===f.id)p.active=p.floors[0].id;for(const l of p.floors)l.stairs=l.stairs.filter(s=>s.to!==f.id&&p.floors.indexOf(p.floors.find(n=>n.id===s.to)!)===p.floors.indexOf(l)+1);continue;}
  if(e.action==='duplicate'){const n=structuredClone(f);n.id=uid();n.name=e.name||f.name+' copy';const ids=new Map(n.rooms.map(r=>[r.id,uid()]));n.rooms.forEach(r=>r.id=ids.get(r.id)!);n.openings.forEach(o=>{o.id=uid();o.roomId=ids.get(o.roomId)!});n.walls.forEach(w=>w.id=uid());n.exteriors.forEach(x=>{x.id=uid();if(x.roomId)x.roomId=ids.get(x.roomId)!});n.stairs=[];if(e.height!==undefined)n.height=e.height;p.floors.push(n);p.active=n.id;continue;}
  if(e.name!==undefined)f.name=e.name;
  if(e.height!==undefined){if(f.openings.some(o=>o.sill+o.height>e.height!))throw Error('Floor height would cut through an opening.');f.height=e.height;}
 }
})}
export function executeSurfaceEdits(project:Project,input:unknown){const {edits}=batch(surfaceEdit).parse(input);return applyProjectChange(project,p=>{
 for(const raw of edits){const label=raw.target==='labeled-wall'&&raw.wallLabel?resolveWallLabel(p,raw.wallLabel):undefined;if(raw.target==='labeled-wall'&&!label)throw Error('Provide the displayed wallLabel reference.');const e:z.infer<typeof surfaceEdit>=label?{...raw,target:label.wallId?'wall':label.face==='exterior'?'room-exterior':'room-wall',floorId:label.floorId,roomId:label.roomId,id:label.wallId,side:label.side}:raw;const value=e.color??undefined;
  if(e.target==='interior'||e.target==='exterior'){if(e.floorId||e.roomId||e.id||e.side!==undefined)throw Error('Global colors do not take room or floor IDs.');p[e.target==='interior'?'interiorColor':'exteriorColor']=value;continue;}
  const f=floor(p,e.floorId);
  if(e.target==='wall'||e.target==='exterior-feature'){const item=e.target==='wall'?f.walls.find(w=>w.id===e.id):f.exteriors.find(x=>x.id===e.id);if(!item)throw Error('Element ID not found.');if(e.roomId||e.side!==undefined)throw Error('Use an element ID for this color target.');item.color=value;continue;}
  const r=f.rooms.find(r=>r.id===e.roomId);if(!r)throw Error('Room ID not found.');
  if(e.target==='room-floor'){if(value===undefined||e.side!==undefined)throw Error('Room floor color requires a hex color and no wall side.');r.color=value;continue;}
  const key=e.target==='room-wall'?'wallColors':'exteriorColors',defaultKey=e.target==='room-wall'?'wallColor':'exteriorColor';
  if(e.side===undefined){r[defaultKey]=value;delete r[key];}
  else{if(e.side>=roomEdges(r).length)throw Error('Wall side does not exist for this room footprint.');const colors={...r[key]};if(value)colors[String(e.side)]=value;else delete colors[String(e.side)];r[key]=colors;}
 }
})}
export function executeExteriorEdits(project:Project,input:unknown){const {edits}=batch(exteriorEdit).parse(input);return applyProjectChange(project,p=>{
 for(const e of edits){const f=floor(p,e.floorId);let item=f.exteriors.find(x=>x.id===e.id);
  if(e.action==='delete'){if(!item)throw Error('Exterior feature ID not found.');f.exteriors=f.exteriors.filter(x=>x.id!==e.id);continue;}
  if(e.action==='duplicate'){if(!item)throw Error('Exterior feature ID not found.');item={...item,id:uid(),x:item.x+2,y:item.y+2};f.exteriors.push(item);}
  if(e.action==='add'){if(!f.rooms.length)throw Error('Place a room on this floor before adding an exterior feature.');if(!e.kind||(!e.roomId&&(e.x===undefined||e.y===undefined)))throw Error('New exterior features require kind and either roomId/side or x/y.');item={id:uid(),kind:e.kind,x:e.x||0,y:e.y||0,w:e.width||10,d:e.depth||4,...(e.roomId?{width:e.width||10,projection:e.depth||4}:{})};f.exteriors.push(item);}
  if(!item)throw Error('Exterior feature ID not found.');
  if(e.kind)item.kind=e.kind;if(e.variant)item.variant=e.variant;if(e.roomId)item.roomId=e.roomId;if(e.side!==undefined)item.side=e.side;if(e.offset!==undefined)item.offset=e.offset;if(e.x!==undefined)item.x=e.x;if(e.y!==undefined)item.y=e.y;if(e.width!==undefined)item.w=e.width;if(e.depth!==undefined)item.d=e.depth;if(e.color!==undefined)item.color=e.color??undefined;
  if(item.roomId){if(item.side===undefined)throw Error('Hosted features require a wall side.');if(e.width!==undefined)item.width=e.width;if(e.depth!==undefined)item.projection=e.depth;Object.assign(item,exteriorPlacement(f,item));validateExteriorHost(f,item);}
  if(item.x<0||item.y<0||item.x+item.w>p.plot.w||item.y+item.d>p.plot.d)throw Error('Exterior feature must fit inside the plot.');
 }
})}
const schema=(properties:object,required:string[]=[])=>({type:'object',properties,required,additionalProperties:false});
const string={type:'string'},number={type:'number'},colorSchema={anyOf:[{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},{type:'null'}]};
const editsSchema=(properties:object,required:string[])=>schema({edits:{type:'array',minItems:1,maxItems:60,items:schema(properties,required)}},['edits']);
export const floorTool={type:'function',name:'apply_floor_edits',description:'Add, rename, resize storey height, select, duplicate or delete floor plans in an atomic batch. Duplicate requires the source floor ID; new IDs are returned in the project. Keep at least one floor. Heights are feet.',parameters:editsSchema({action:{enum:['add','update','delete','select','duplicate'],type:'string'},id:string,name:string,height:{...number,minimum:7,maximum:30}},['action'])};
export const surfaceTool={type:'function',name:'apply_surface_colors',description:'To paint a wall named in Walk mode, use target labeled-wall with wallLabel equal to its displayed W- reference; the correct face and wall are resolved automatically. Set or reset colors on interior/exterior defaults, a room floor, room-facing wall, exposed room exterior, independent wall, or exterior feature. Use exact IDs and zero-based wall side indices from get_project; omit side to paint all room walls (clears side overrides). Shared walls keep independent room-facing colors. Room exterior paint affects only exposed faces. Hex #RRGGBB; null resets inheritance except room-floor. Global defaults preserve explicit room overrides.',parameters:editsSchema({target:{type:'string',enum:['interior','exterior','room-wall','room-exterior','room-floor','wall','exterior-feature','labeled-wall']},wallLabel:string,floorId:string,roomId:string,id:string,side:{type:'integer',minimum:0,maximum:11},color:colorSchema},['target','color'])};
export const exteriorTool={type:'function',name:'apply_exterior_edits',description:'Add, update, duplicate or delete terraces, balconies, canopies, frames and sunshades with style variants. Wall-hosted canopy/frame/sunshade: supply roomId, exposed wall side, offset along wall, width along wall and depth outward. Hosts follow moved rooms. Free-standing legacy features and terraces/balconies use x,y,width,depth. Geometry is feet. Colors are optional #RRGGBB.',parameters:editsSchema({action:{type:'string',enum:['add','update','delete','duplicate']},floorId:string,id:string,kind:{type:'string',enum:[...exteriorKinds]},variant:{type:'string',enum:[...exteriorVariants]},roomId:string,side:{type:'integer',minimum:0,maximum:11},offset:{...number,minimum:0},x:number,y:number,width:{...number,exclusiveMinimum:0},depth:{...number,exclusiveMinimum:0},color:colorSchema},['action'])};
export const mutationTools=[floorTool,editTool,surfaceTool,exteriorTool,finishTool,...editorMutationTools];
export function executeStudioTool(project:Project,tool:string,input:unknown):Project{
 if(tool===finishTool.name)return executeFinishEdits(project,input);
 if(editorExecutors[tool])return editorExecutors[tool](project,input);
 if(tool===floorTool.name)return executeFloorEdits(project,input);
 if(tool===surfaceTool.name)return executeSurfaceEdits(project,input);
 if(tool===exteriorTool.name)return executeExteriorEdits(project,input);
 if(tool===editTool.name){const args=z.object({edits:z.array(z.unknown()).min(1).max(60)}).strict().parse(input);return executeRoomEdits(project,args.edits as Parameters<typeof executeRoomEdits>[1]);}
 throw Error('Unsupported studio action.');
}
export function inspectProject(project:Project){return {project,wallLabels:projectWallLabels(project).map(({anchors,height,...label})=>label),areas:areas(project),checks:validate(project),wallSides:project.floors.map(f=>({floorId:f.id,rooms:f.rooms.map(r=>({roomId:r.id,name:r.name,sides:roomEdges(r).map(e=>({side:e.side,name:roomWallName(r,e.side),length:Math.hypot(e.x2-e.x,e.y2-e.y),x:e.x,y:e.y,x2:e.x2,y2:e.y2}))}))})),units:'All geometry and storey heights are in feet; side indices are zero-based.'};}
export const spaceCatalog=()=>({spaces:presets,footprints:roomShapes,exteriorStyles:exteriorPresets,facadeFinishes});
