import {z} from 'zod';
import {allFinishes} from './exteriorDesign.ts';
import {applyProjectChange,floorOf,roomEdges} from './model.ts';
import type {Project} from './model.ts';
import {resolveWallLabel} from './wallLabels.ts';
const edit=z.object({target:z.enum(['project','room','room-wall','wall','labeled-wall']),finish:z.enum(allFinishes).nullable(),floorId:z.string().optional(),roomId:z.string().optional(),id:z.string().optional(),side:z.number().int().min(0).max(11).optional(),wallLabel:z.string().optional()}).strict();
export function executeFinishEdits(project:Project,input:unknown){const {edits}=z.object({edits:z.array(edit).min(1).max(60)}).strict().parse(input);return applyProjectChange(project,p=>{
 for(const raw of edits){let e=raw;if(e.target==='labeled-wall'){const label=resolveWallLabel(p,e.wallLabel||'');if(label.face==='interior')throw Error('Façade finishes apply to exterior wall faces. Use an exterior wall label.');e={...e,target:label.wallId?'wall':'room-wall',floorId:label.floorId,roomId:label.roomId,id:label.wallId,side:label.side};}
  const value=e.finish??undefined;if(e.target==='project'){p.finish=value||'Mineral stucco';continue;}
  const f=e.floorId?p.floors.find(f=>f.id===e.floorId):floorOf(p);if(!f)throw Error('Floor not found.');
  if(e.target==='wall'){const wall=f.walls.find(w=>w.id===e.id);if(!wall||wall.type!=='Exterior')throw Error('Choose an exterior independent wall.');wall.finish=value;continue;}
  const room=f.rooms.find(r=>r.id===e.roomId);if(!room)throw Error('Room not found.');
  if(e.target==='room'){room.exteriorFinish=value;delete room.exteriorFinishes;}
  else{if(e.side===undefined||e.side>=roomEdges(room).length)throw Error('Choose a valid wall side.');const finishes={...room.exteriorFinishes};if(value)finishes[e.side]=value;else delete finishes[e.side];room.exteriorFinishes=finishes;}
 }
})}
export const finishTool={type:'function',name:'apply_exterior_finishes',description:'Apply lightweight façade materials: Mineral stucco, Brick masonry, Exposed concrete, Timber cladding or Metal panel. Set the project default, all exterior faces of a room, a specific room-wall side, an exterior independent wall, or an exterior W- wallLabel. Null resets inheritance. Explicit paint remains in place; finishes affect only exterior faces.',parameters:{type:'object',additionalProperties:false,required:['edits'],properties:{edits:{type:'array',minItems:1,maxItems:60,items:{type:'object',additionalProperties:false,required:['target','finish'],properties:{target:{type:'string',enum:['project','room','room-wall','wall','labeled-wall']},finish:{anyOf:[{type:'string',enum:[...allFinishes]},{type:'null'}]},floorId:{type:'string'},roomId:{type:'string'},id:{type:'string'},side:{type:'integer',minimum:0,maximum:11},wallLabel:{type:'string'}}}}}}};
