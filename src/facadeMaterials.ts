import * as THREE from 'three';
export const finishProfiles:Record<string,{color:string;roughness:number;metalness:number}>={
 'Mineral stucco':{color:'#e6dfcd',roughness:.96,metalness:0},'Brick masonry':{color:'#ae7056',roughness:.9,metalness:0},'Exposed concrete':{color:'#a2a49e',roughness:.88,metalness:0},'Timber cladding':{color:'#a27c55',roughness:.75,metalness:0},'Metal panel':{color:'#87949b',roughness:.42,metalness:.55}
};
export function facadeMaterial(finish:string,color:string,opacity=1){
 const profile=finishProfiles[finish],material=new THREE.MeshStandardMaterial({color,roughness:profile?.roughness??.9,metalness:profile?.metalness??0,transparent:opacity<1,opacity});
 return material;
}
