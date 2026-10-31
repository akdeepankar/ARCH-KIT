import {z} from 'zod';
import {runViewRender} from './viewRender.ts';
import type {ViewRender} from '../../src/ai/types.ts';
import {interpretPlan,interpretAppearance} from './interpret.ts';
import {validProject} from '../../src/model.ts';
import type {Project} from '../../src/model.ts';
import type {Batch,Concept} from '../../src/ai/types.ts';
import {GalleryStore,namespace,safeId} from './store.ts';
import {buildPrompts} from './prompts.ts';
import {renderImage,IMAGE} from './meta.ts';
const rate=new Map<string,number[]>(),inflight=new Map<string,Promise<Concept>>();
const viewInflight=new Map<string,Promise<ViewRender>>();
const modes=['building','interior','refine','views'] as const;
const createSchema=z.object({prompt:z.string().trim().min(1).max(6000),mode:z.enum(modes),roomId:z.string().optional(),planId:z.string(),sourceView:z.enum(['plan','orbit','walk']).optional(),referenceIds:z.array(z.string()).max(4).default([]),parentId:z.string().optional(),repeatBatchId:z.string().optional()});
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
function limit(key:string,max:number,window:number){const now=Date.now(),times=(rate.get(key)||[]).filter(t=>now-t<window);if(times.length>=max)throw Error('Please wait before starting another AI request.');rate.set(key,[...times,now]);if(rate.size>2000)for(const [k,v]of rate)if(now-v[v.length-1]>3600000)rate.delete(k)}
async function body(request:Request){if(!request.headers.get('content-type')?.includes('application/json'))throw Error('Send a JSON request.');const reader=request.body?.getReader();if(!reader)throw Error('Request is empty.');let size=0,text='';const decoder=new TextDecoder();while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>6_000_000){await reader.cancel();throw Error('Image or project is too large. Maximum request is 6 MB.')}text+=decoder.decode(r.value,{stream:true})}return JSON.parse(text+decoder.decode())}
export async function handleCreativeRequest(request:Request,env:{MODEL_API_KEY?:string;BUCKET?:R2Bucket},fetcher:typeof fetch=fetch){
 const u=new URL(request.url),action=u.pathname.split('/').pop(),user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in to ArchKit to use your creative workspace.'},401);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==u.origin)return json({error:'Invalid request origin.'},403);
 if(action==='status')return json({configured:!!env.MODEL_API_KEY,storage:!!env.BUCKET,model:IMAGE});
 if(!env.BUCKET)return json({error:'The project image gallery is not connected yet.'},503);
 try{
 const data=request.method==='POST'?await body(request):null,projectId=data?.projectId||u.searchParams.get('projectId');
 const store=new GalleryStore(env.BUCKET,await namespace(user,projectId),projectId);
 if(action==='asset'&&request.method==='GET'){
  const id=u.searchParams.get('id');if(!safeId(id))return json({error:'Invalid image.'},400);
  const o=await env.BUCKET.get(store.prefix+'assets/'+id);if(!o)return json({error:'Image not found.'},404);
  return new Response(o.body,{headers:{'Content-Type':o.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Content-Disposition':u.searchParams.get('download')?'attachment; filename="archkit-concept.webp"':'inline'}});
 }
 if(action==='view-history'&&request.method==='GET'){const keys=await store.list('view-renders/');const history=(await Promise.all(keys.map(k=>store.read<ViewRender>(k)))).filter((r):r is ViewRender=>!!r).sort((a,b)=>a.createdAt-b.createdAt);return json({history});}
 if(action==='gallery'&&request.method==='GET')return json(await store.gallery());
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(action==='upload'){
  limit(user+':upload',40,60000);
  if(typeof data.image!=='string'||data.image.length>5_500_000)throw Error('Image must be smaller than 4 MB.');
  const match=data.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);if(!match)throw Error('Choose a PNG, JPEG, or WebP image.');
  const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));if(bytes.length<12||bytes.length>4_000_000)throw Error('Image must be smaller than 4 MB.');
  const magic=match[1]==='image/png'?bytes[0]===137&&bytes[1]===80:match[1]==='image/jpeg'?bytes[0]===255&&bytes[1]===216:String.fromCharCode(...bytes.slice(0,4))==='RIFF';if(!magic)throw Error('The image format does not match its contents.');
  const asset=await store.saveAsset(bytes,match[1],String(data.name||'Reference image').slice(0,100));
  if(data.saveReference){const refs=(await store.read<any[]>('references.json'))||[];await store.write('references.json',[...refs,asset]);}return json(asset);
 }
 if(action==='select'){
  if(data.id===null){await store.write('selected.json',{});return json({ok:true});}
  if(!safeId(data.id)||!await store.read<Concept>('results/'+data.id+'.json'))throw Error('Select a completed concept from this project.');
  await store.write('selected.json',{id:data.id});return json({ok:true});
 }
 if(!env.MODEL_API_KEY)return json({error:'Connect MODEL_API_KEY in server secrets to use Muse models.'},503);
 if(action==='view-render'){
  if(!safeId(data.id))throw Error('Invalid visualization request.');
  const done=await store.read<ViewRender>('view-renders/'+data.id+'.json');if(done)return json(done);
  const lock=store.prefix+data.id;if(viewInflight.has(lock))return json(await viewInflight.get(lock));
  limit(user+':render',40,3600000);const task=runViewRender(env.MODEL_API_KEY,store,data,data.project,fetcher);viewInflight.set(lock,task);try{return json(await task)}finally{viewInflight.delete(lock)}
 }
 if(action==='interpret'||action==='appearance'){
  limit(user+':interpret',6,60000);
  if(!validProject(data.project)||data.project.id!==projectId||typeof data.prompt!=='string'||data.prompt.length>6000)throw Error('A valid project and design request are required.');
  const project:Project=data.project;
  let proposal;
  if(action==='interpret'){
   const ids=z.array(z.string()).min(1).max(4).parse(data.referenceIds);const images=await Promise.all(ids.map(id=>store.image(id)));
   const calibration=data.calibration?z.object({points:z.array(z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)})).length(2),feet:z.number().positive().max(500),imageWidth:z.number().positive().max(20000),imageHeight:z.number().positive().max(20000)}).parse(data.calibration):undefined;
   const result=await interpretPlan(env.MODEL_API_KEY,project,data.prompt,images,calibration,fetcher);
   proposal={...result,id:crypto.randomUUID(),projectId,createdAt:Date.now(),sourceId:ids[0],sourceSnapshot:JSON.stringify(project)};
  }else{
   if(!safeId(data.conceptId))throw Error('Select a saved concept.');const concept=await store.read<Concept>('results/'+data.conceptId+'.json');if(!concept?.asset)throw Error('Concept not found.');
   const result=await interpretAppearance(env.MODEL_API_KEY,project,data.prompt,await store.image(concept.asset.id),fetcher);
   proposal={...result,id:crypto.randomUUID(),kind:'appearance',projectId,createdAt:Date.now(),sourceId:concept.asset.id,sourceSnapshot:JSON.stringify(project)};
  }
  await store.write('proposals/'+proposal.id+'.json',proposal);return json(proposal);
 }
 if(action==='prepare'){
  limit(user+':prepare',6,60000);
  const args=createSchema.parse(data);let project:Project=data.project;
  if(args.repeatBatchId){if(!safeId(args.repeatBatchId))throw Error('Invalid source batch.');const old=await store.read<Batch>('batches/'+args.repeatBatchId+'.json');if(!old)throw Error('Source batch not found.');project=old.project;Object.assign(args,{prompt:old.prompt,mode:old.mode,roomId:old.roomId,planId:old.planId,sourceView:old.sourceView,referenceIds:old.referenceIds,parentId:old.parentId});}
  if(!validProject(project)||project.id!==projectId)throw Error('A valid current project is required.');
  if(args.mode==='interior'&&!project.floors.flatMap(f=>f.rooms).some(r=>r.id===args.roomId))throw Error('Select a room in the plan before designing its interior.');
  if(['refine','views'].includes(args.mode)&&!args.parentId)throw Error('Select a concept first.');
  const refs=[args.planId,...args.referenceIds];if(args.parentId){if(!safeId(args.parentId))throw Error('Invalid selected concept.');const parent=await store.read<Concept>('results/'+args.parentId+'.json');if(!parent?.asset)throw Error('Selected concept not found.');refs.splice(1,0,parent.asset.id)}
  const images=await Promise.all(refs.map(id=>store.image(id)));
  const p=await buildPrompts(env.MODEL_API_KEY,project,args.prompt+(args.repeatBatchId?' Create fresh alternatives with different compatible materials and compositions. Batch seed '+crypto.randomUUID():''),args.mode,images,args.roomId,fetcher,args.sourceView);
  const id=crypto.randomUUID(),createdAt=Date.now();
  const batch:Batch={id,createdAt,projectId,project,prompt:args.prompt,mode:args.mode,roomId:args.roomId,planId:args.planId,sourceView:args.sourceView,referenceIds:args.referenceIds,parentId:args.parentId,summary:p.summary,concepts:p.concepts.map((c,slot)=>({id:crypto.randomUUID(),batchId:id,slot,title:c.title,prompt:c.prompt,status:'queued',parentId:args.parentId,createdAt,model:IMAGE}))};
  await store.write('batches/'+id+'.json',batch);return json(batch);
 }
 if(action==='render'){
  if(!safeId(data.batchId)||!Number.isInteger(data.slot)||data.slot<0||data.slot>2)throw Error('Invalid generation slot.');
  const batch=await store.read<Batch>('batches/'+data.batchId+'.json');if(!batch)throw Error('Generation batch not found.');
  const concept=batch.concepts[data.slot],done=await store.read<Concept>('results/'+concept.id+'.json');if(done?.status==='completed')return json(done);
  const lock=store.prefix+concept.id;if(inflight.has(lock))return json(await inflight.get(lock));
  limit(user+':render',40,3600000);
  const task=(async()=>{try{
    const refs=[...(batch.planId?[batch.planId]:[]),...batch.referenceIds];
    if(batch.parentId){const parent=await store.read<Concept>('results/'+batch.parentId+'.json');if(!parent?.asset)throw Error('Original concept is missing.');refs.splice(1,0,parent.asset.id)}
    const images=await Promise.all(refs.map(id=>store.image(id)));
    const result=await renderImage(env.MODEL_API_KEY!,concept.prompt,images,fetcher);
    const asset=await store.saveAsset(result.bytes,result.contentType,concept.title,concept.id);
    const completed:Concept={...concept,status:'completed',asset};await store.write('results/'+concept.id+'.json',completed);return completed;
   }catch(e){const failed:Concept={...concept,status:'failed',error:e instanceof Error?e.message:'Generation failed. Retry this image.'};await store.write('results/'+concept.id+'.json',failed);return failed;}
  })();inflight.set(lock,task);try{return json(await task)}finally{inflight.delete(lock)}
 }
 return json({error:'Unknown creative action.'},404);
 }catch(e){return json({error:e instanceof z.ZodError?'Some design settings are invalid. Check your request and try again.':e instanceof Error?e.message:'This action could not finish. Your plan is unchanged.'},400)}
}
