import type {Floor,Project} from './model.ts';
// Clear room heights are measured above the finished floor. The slab sits
// between the ceiling below and the finished floor of the next level.
export const FLOOR_SLAB_THICKNESS=.3;
export const floorRise=(floor:Pick<Floor,'height'>)=>floor.height+FLOOR_SLAB_THICKNESS;
export function floorElevation(project:Project,index:number){return project.floors.slice(0,index).reduce((base,floor)=>base+floorRise(floor),0);}
