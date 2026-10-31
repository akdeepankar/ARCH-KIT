import {flushSync} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Camera,Download,LoaderCircle,RefreshCw,Sparkles,X} from 'lucide-react';
import type {z} from 'zod';
import type {visualizationInput} from './editorBridge';
import type {Project} from './model';
import type {ViewRender,Asset} from './ai/types';
import {creative} from './ai/client';
export type VisualizationBridge={state:()=>unknown;run:(input:z.infer<typeof visualizationInput>)=>Promise<unknown>};
type RenderRequest={projectId:string;project:Project;id:string;prompt:string;view:'plan'|'orbit'|'walk';referenceId?:string;parentId?:string};
export function VisualizationTray({project,view,open,onClose,onCapture,bridgeRef}:{bridgeRef?:{current:VisualizationBridge|null};project:Project;view:string;open:boolean;onClose:()=>void;onCapture:()=>Promise<string>}){
 const[history,setHistory]=useState<ViewRender[]>([]),[index,setIndex]=useState(-1),[prompt,setPrompt]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[reference,setReference]=useState<string>(),[loading,setLoading]=useState(true);
 const alive=useRef(true),pending=useRef<RenderRequest|null>(null),running=useRef(false);const current=history[index];
 useEffect(()=>{alive.current=true;let active=true;(async()=>{try{const response=await fetch('/api/creative/view-history?projectId='+encodeURIComponent(project.id),{cache:'no-store'});const result=await response.json() as {history?:ViewRender[];error?:string};if(!response.ok)throw Error(result.error||'Unable to open visualization history.');if(active){const records=result.history||[];setHistory(records);setIndex(records.length-1)}}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load history.')}finally{if(active)setLoading(false)}})();return()=>{active=false;alive.current=false}},[project.id]);
 async function run(kind:'generate'|'refine'|'retry',overridePrompt?:string,toolCall=false){
  const requestPrompt=overridePrompt??prompt;if(running.current){if(toolCall)throw Error('Image generation is already running.');return;}if(loading){if(toolCall)throw Error('Visualization history is still loading.');return;}if(kind==='retry'&&!pending.current){if(toolCall)throw Error('There is no failed image request to retry.');return;}if(kind==='refine'&&(!current||!requestPrompt.trim())){if(toolCall)throw Error('Select an existing visualization and provide a refinement prompt.');return;}
  running.current=true;setError('');if(kind!=='retry')pending.current=null;
  try{let request:RenderRequest;
   if(kind==='retry'&&pending.current)request=pending.current;
   else{const snapshot=structuredClone(project),mode=view==='orbit'?'orbit':view==='walk'?'walk':'plan';request={projectId:snapshot.id,project:snapshot,id:crypto.randomUUID(),view:mode,prompt:requestPrompt.trim()||(mode==='plan'?'Visualize this floor plan as a contemporary home with realistic materials, warm natural light and landscaping.':'Turn this 3D view into a realistic architectural visualization with refined materials and natural light.')};
    if(kind==='refine'){request.parentId=current!.id;setReference(current!.asset.url)}
    else{setBusy('Capturing '+(mode==='plan'?'Floor Plan':mode==='orbit'?'3D Orbit':'Walk')+'…');const image=await onCapture();if(alive.current)setReference(image);const asset=await creative<Asset>('upload',{projectId:snapshot.id,image,name:'Captured '+mode+' view'});request.referenceId=asset.id;}
    pending.current=request;
   }
   if(alive.current)setBusy(kind==='refine'||request.parentId?'Refining your image…':'Designing from your captured view…');
   const result=await creative<ViewRender>('view-render',request);
   if(alive.current){flushSync(()=>{setHistory(records=>{const exists=records.findIndex(r=>r.id===result.id);if(exists>=0){setIndex(exists);return records}setIndex(records.length);return[...records,result]});setPrompt('');pending.current=null;});}
   return result;
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'This image could not finish. Please retry.');if(toolCall)throw e;}finally{running.current=false;if(alive.current)flushSync(()=>setBusy(''));}
 }
 useEffect(()=>{if(!bridgeRef)return;const bridge:VisualizationBridge={state:()=>({loading,busy,error,index,selectedId:current?.id,history:history.map(r=>({id:r.id,prompt:r.prompt,createdAt:r.createdAt,view:r.view,url:r.asset.url,parentId:r.parentId}))}),run:async input=>{
  if(['generate','refine','retry'].includes(input.action)){const result=await run(input.action as 'generate'|'refine'|'retry',input.prompt,true);return {success:true,visualization:result};}
  const target=input.action==='select'?history.findIndex(r=>r.id===input.id):input.action==='previous'?index-1:index+1;if(target<0||target>=history.length)throw Error('Requested visualization is unavailable.');flushSync(()=>setIndex(target));return {success:true,selected:history[target]};
 }};bridgeRef.current=bridge;return()=>{if(bridgeRef.current===bridge)bridgeRef.current=null;};});
 return <section id="bottom-visualize-tray" className="view-visualizer" hidden={!open} aria-label="Visualization studio">
  <header><span><Sparkles size={12}/> VISUALIZE</span><small>{view==='plan'?'Floor Plan':view==='orbit'?'3D Orbit':'Walk'} → Muse Image</small><div className="view-history-controls"><button aria-label="Previous visualization" title="Previous image" disabled={index<=0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={13}/></button><span>{history.length?index+1:0} / {history.length}</span><button aria-label="Next visualization" title="Next image" disabled={index>=history.length-1} onClick={()=>setIndex(i=>i+1)}><ArrowRight size={13}/></button></div><button aria-label="Close visualization previews" title="Close visualization" onClick={onClose}><X size={13}/></button></header>
  <div className="view-visualizer-body"><div className={'view-preview '+(current?'has-image':'')}>
   {current?<img src={current.asset.url} alt={current.prompt}/>:reference?<img src={reference} alt="Captured view used as design reference"/>:<div className="view-preview-empty"><Camera size={25} strokeWidth={1.2}/><span>Your architectural visualization</span></div>}
   {busy&&<div className="view-generation-progress" role="status"><LoaderCircle size={19}/><span>{busy}</span></div>}
   <button className="view-generate" disabled={!!busy||loading} onClick={()=>run('generate')}><Sparkles size={12}/>{current?'Generate from current view':'Generate'}</button>
   {current&&<a className="view-download" href={current.asset.url+'&download=1'} download aria-label="Download visualization" title="Download image"><Download size={13}/></a>}
  </div><form className="view-prompt" onSubmit={e=>{e.preventDefault();run(current?'refine':'generate')}}>
   <label htmlFor="view-design-prompt">{current?'Refine this image':'Describe your design'}</label><textarea id="view-design-prompt" aria-label="Visualization prompt" placeholder={current?'Change the roof, materials, lighting, or landscaping…':'A modern home, warm white walls, timber accents, a green courtyard…'} value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={6000} disabled={!!busy} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();run(current?'refine':'generate')}}}/>
   {error&&<div className="view-render-error" role="alert"><span>{error}</span>{pending.current&&<button type="button" disabled={!!busy} onClick={()=>run('retry')}><RefreshCw size={10}/> Retry</button>}</div>}
   <footer><small>{current?'Edits use the displayed image.':'Generate captures the view above.'}</small>{current&&<button type="submit" className="view-refine" disabled={!!busy||!prompt.trim()}><Sparkles size={11}/> Refine</button>}</footer><p className="view-concept-note">Concept imagery · approximate geometry. The editable model stays unchanged.</p>
  </form></div>
 </section>
}
