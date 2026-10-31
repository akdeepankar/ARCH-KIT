import assert from 'node:assert/strict';
import {handleCreativeRequest} from '../server/ai/router.ts';
import {emptyProject} from '../src/model.ts';
import {GenerationQueue} from '../src/ai/client.ts';
class Bucket{
 objects=new Map();
 async put(key,value,options={}){this.objects.set(key,{value,options});}
 async get(key){const x=this.objects.get(key);if(!x)return null;return {httpMetadata:x.options.httpMetadata,body:x.value,json:async()=>JSON.parse(x.value),arrayBuffer:async()=>x.value.buffer.slice(x.value.byteOffset,x.value.byteOffset+x.value.byteLength)}}
 async list({prefix}){return {objects:[...this.objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}
}
const project=emptyProject(),bucket=new Bucket(),env={MODEL_API_KEY:'test',BUCKET:bucket};let images=0;
const fake=async(url,opts)=>{const b=JSON.parse(opts.body);if(url.endsWith('responses')){assert.equal(b.model,'muse-spark-1.3');assert.equal(b.input[0].content[1].type,'input_image');return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Three directions.',concepts:[1,2,3].map(n=>({title:'Concept '+n,prompt:'Render a realistic building preserving the supplied canonical floor plan, variation '+n}))})}]}]})}images++;assert.equal(url,'https://api.meta.ai/v1/images/edits');assert.equal(b.model,'muse-image-1.0');assert.equal(b.n,1);if(images===2)return new Response('quota',{status:429});return Response.json({data:[{b64_json:btoa('RIFF'+'.'.repeat(110))}],output_format:'webp'})};
const call=(action,data,user='owner',method='POST')=>handleCreativeRequest(new Request('https://arch.test/api/creative/'+action+(method==='GET'?'?projectId='+project.id:''),{method,headers:{'oai-authenticated-user-id':user,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({projectId:project.id,...data})}:{})}),env,fake);
let r=await call('upload',{image:'data:image/png;base64,'+btoa(String.fromCharCode(137,80)+'.'.repeat(30)),name:'Plan'});assert.equal(r.status,200);const plan=await r.json();
r=await call('prepare',{project,prompt:'Modern home',mode:'building',planId:plan.id});assert.equal(r.status,200);const batch=await r.json();assert.equal(batch.concepts.length,3);
const results=[];for(let slot=0;slot<3;slot++)results.push(await (await call('render',{batchId:batch.id,slot})).json());assert.equal(results[0].status,'completed');assert.equal(results[1].status,'failed');assert.match(results[1].error,/rate limit/);assert.equal(results[2].status,'completed');
const retried=await(await call('render',{batchId:batch.id,slot:1})).json();assert.equal(retried.status,'completed');
await call('render',{batchId:batch.id,slot:0});assert.equal(images,4,'Completed renders are idempotent.');
const gallery=await(await call('gallery',null,'owner','GET')).json();assert.equal(gallery.batches[0].concepts.filter(c=>c.status==='completed').length,3);
const denied=await call('render',{batchId:batch.id,slot:0},'another-user');assert.equal(denied.status,400);assert.match((await denied.json()).error,/not found/);
assert.equal((await handleCreativeRequest(new Request('https://arch.test/api/creative/status'),env)).status,401);
let active=0,peak=0,done=0;const q=new GenerationQueue(2);await new Promise(resolve=>{for(let i=0;i<6;i++)q.add(async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;if(++done===6)resolve()})});assert.equal(peak,2);
console.log('PASS: real request shapes, three-image batches, partial failure and retry, saved assets, user isolation, idempotent successful renders, and concurrency limit.');
