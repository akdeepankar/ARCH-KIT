export async function creative<T>(action:string,body:unknown):Promise<T>{const r=await fetch('/api/creative/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json() as any;if(!r.ok)throw Error(data.error||'The creative request could not finish.');return data as T}
export class GenerationQueue{
 private tasks:(()=>Promise<void>)[]=[];private running=0;
 private concurrency:number;
 constructor(concurrency=2){this.concurrency=concurrency}
 add(task:()=>Promise<void>){this.tasks.push(task);this.drain()}
 private drain(){while(this.running<this.concurrency&&this.tasks.length){const task=this.tasks.shift()!;this.running++;Promise.resolve().then(task).catch(()=>{}).finally(()=>{this.running--;this.drain()})}}
}
