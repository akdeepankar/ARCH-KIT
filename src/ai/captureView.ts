async function rasterize(source:string,width:number,height:number){
 const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error('Could not capture this view. Try again once it has loaded.'));img.src=source});
 const scale=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d');if(!context)throw Error('Image capture is unavailable in this browser.');context.fillStyle='#f7f7f7';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.92);
}
export async function capturePlanViewport(svg:SVGSVGElement){
 const bounds=svg.getBoundingClientRect();if(bounds.width<1||bounds.height<1)throw Error('Open your floor plan before capturing it.');
 const copy=svg.cloneNode(true) as SVGSVGElement;copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width',String(bounds.width*2));copy.setAttribute('height',String(bounds.height*2));copy.querySelectorAll('[data-transient]').forEach(el=>el.remove());
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));try{return await rasterize(url,bounds.width*2,bounds.height*2)}finally{URL.revokeObjectURL(url)}
}
export async function captureSceneViewport(capture:()=>string){const source=capture();const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error('Could not capture the 3D view.'));img.src=source});return rasterize(source,img.naturalWidth,img.naturalHeight)}
