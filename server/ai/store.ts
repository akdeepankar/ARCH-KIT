import type {Asset,Batch,Concept,Gallery,DesignProposal} from '../../src/ai/types.ts';
export const safeId=(id:unknown):id is string=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
export async function namespace(user:string,projectId:string){if(!safeId(projectId))throw Error('Invalid project ID.');const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user));return 'ai/'+Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('')+'/'+projectId+'/'}
export class GalleryStore{
 bucket:R2Bucket;prefix:string;projectId:string;
 constructor(bucket:R2Bucket,prefix:string,projectId:string){this.bucket=bucket;this.prefix=prefix;this.projectId=projectId}
 async read<T>(key:string):Promise<T|null>{const o=await this.bucket.get(this.prefix+key);return o?o.json<T>():null}
 async write(key:string,value:unknown){await this.bucket.put(this.prefix+key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'}})}
 asset(id:string,name='Reference'):Asset{return{id,name,url:`/api/creative/asset?projectId=${encodeURIComponent(this.projectId)}&id=${id}`}}
 async saveAsset(bytes:Uint8Array,contentType:string,name:string,id=crypto.randomUUID()):Promise<Asset>{await this.bucket.put(this.prefix+'assets/'+id,bytes,{httpMetadata:{contentType},customMetadata:{name:name.slice(0,100)}});return this.asset(id,name)}
 async image(id:string){if(!safeId(id))throw Error('Invalid image reference.');const o=await this.bucket.get(this.prefix+'assets/'+id);if(!o||!/^image\/(png|jpeg|webp)$/.test(o.httpMetadata?.contentType||''))throw Error('Reference image not found in this project.');const b=new Uint8Array(await o.arrayBuffer());if(b.length>20_000_000)throw Error('Reference image is too large.');let binary='';for(let i=0;i<b.length;i+=8192)binary+=String.fromCharCode(...b.subarray(i,i+8192));return `data:${o.httpMetadata!.contentType};base64,${btoa(binary)}`}
 async list(prefix:string){let cursor:string|undefined;const keys:string[]=[];do{const page=await this.bucket.list({prefix:this.prefix+prefix,cursor,limit:1000});keys.push(...page.objects.map(o=>o.key.slice(this.prefix.length)));cursor=page.truncated?page.cursor:undefined;}while(cursor);return keys}
 async gallery():Promise<Gallery>{
 const keys=await this.list('batches/');const batches=(await Promise.all(keys.map(k=>this.read<Batch>(k)))).filter((b):b is Batch=>!!b).sort((a,b)=>a.createdAt-b.createdAt);
 const results=await this.list('results/');const concepts=(await Promise.all(results.map(k=>this.read<Concept>(k)))).filter((c):c is Concept=>!!c);
 for(const b of batches)b.concepts=b.concepts.map(c=>concepts.find(x=>x.id===c.id)||c);
 const proposalKeys=await this.list('proposals/');const proposals=(await Promise.all(proposalKeys.map(k=>this.read<DesignProposal>(k)))).filter((p):p is DesignProposal=>!!p).sort((a,b)=>a.createdAt-b.createdAt);
 return{batches,proposals,references:(await this.read<Asset[]>('references.json'))||[],selectedId:(await this.read<{id:string}>('selected.json'))?.id};
 }
}
