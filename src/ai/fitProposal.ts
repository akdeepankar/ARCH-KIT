import type {Project} from '../model.ts';
import {validProject} from '../model.ts';

// Move the complete drawing together; never resize or rearrange individual rooms.
export function fitProposalToPlot(current:Project){
 const project=structuredClone(current),points:{x:number;y:number}[]=[];
 for(const f of project.floors){for(const r of [...f.rooms,...f.stairs,...f.exteriors])points.push({x:r.x,y:r.y},{x:r.x+r.w,y:r.y+r.d});for(const w of f.walls)points.push({x:w.x,y:w.y},{x:w.x2,y:w.y2});}
 if(!points.length)throw Error('There is no layout to fit yet.');
 const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxX=Math.max(...points.map(p=>p.x)),maxY=Math.max(...points.map(p=>p.y)),s=project.plot.setbacks;
 const dx=Math.max(0,s.left-minX),dy=Math.max(0,s.front-minY),width=Math.max(project.plot.w,maxX+dx+s.right),depth=Math.max(project.plot.d,maxY+dy+s.rear);
 if(width>300||depth>500)throw Error('This drawing exceeds the supported 300 × 500 ft plot. Check its scale before importing; rooms have not been resized.');
 for(const f of project.floors){for(const r of [...f.rooms,...f.stairs,...f.exteriors]){r.x+=dx;r.y+=dy;}for(const w of f.walls){w.x+=dx;w.x2+=dx;w.y+=dy;w.y2+=dy;}}
 project.plot.w=width;project.plot.d=depth;
 if(!validProject(project))throw Error('Fix unsupported geometry before fitting the plot.');
 return{project,dx,dy,width,depth};
}
