import {creative} from './client.ts';
import type {Asset} from './types.ts';
export const viewName=(view:string)=>view==='orbit'?'3D Orbit':view==='walk'?'Walk':'Floor Plan';
export async function captureVisualReference(projectId:string,view:string,capture:()=>Promise<string>,upload:typeof creative=creative){
 const sourceView:'plan'|'orbit'|'walk'=view==='orbit'?'orbit':view==='walk'?'walk':'plan';
 const image=await capture();if(!/^data:image\/(png|jpeg|webp);base64,/.test(image))throw Error('The current view could not be captured. Open your floor plan or 3D view and try again.');
 const asset=await upload<Asset>('upload',{projectId,image,name:'Screenshot · '+viewName(sourceView)});
 return {asset,image,sourceView};
}
