import {validProject} from './model.ts';
import type {Project} from './model.ts';
export const LIBRARY_KEY='archkit.projects.v1';
const LEGACY_KEY='archkit.project.v1';
export type LocalEntry={project:Project;updatedAt:number;deletedAt?:number};
export type LocalLibrary={version:1;activeId:string|null;projects:LocalEntry[];trash:LocalEntry[]};
type Store=Pick<Storage,'getItem'|'setItem'>;
export function readLocalLibrary(storage:Store=localStorage):LocalLibrary{
 const raw=storage.getItem(LIBRARY_KEY);
 if(raw){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.projects)||!Array.isArray(data.trash))throw Error('The local project library could not be read. Export your current project before trying again.');const valid=(e:LocalEntry)=>e&&validProject(e.project)&&Number.isFinite(e.updatedAt);if(!data.projects.every(valid)||!data.trash.every(valid))throw Error('The local project library contains an unreadable project.');return data;}
 const library:LocalLibrary={version:1,activeId:null,projects:[],trash:[]};
 try{const p=JSON.parse(storage.getItem(LEGACY_KEY)||'null');if(validProject(p)){library.projects=[{project:p,updatedAt:Date.now()}];library.activeId=p.id;}}catch{}
 return library;
}
function write(library:LocalLibrary,storage:Store){storage.setItem(LIBRARY_KEY,JSON.stringify(library));return library;}
export function saveLocalProject(project:Project,storage:Store=localStorage){
 const library=readLocalLibrary(storage);const entry={project,updatedAt:Date.now()};library.projects=[entry,...library.projects.filter(e=>e.project.id!==project.id)];library.trash=library.trash.filter(e=>e.project.id!==project.id);library.activeId=project.id;return write(library,storage);
}
export function deleteLocalProject(id:string,active:Project,storage:Store=localStorage){
 const library=readLocalLibrary(storage);const entry=library.projects.find(e=>e.project.id===id);if(!entry)throw Error('This project is no longer in the local library.');
 library.projects=library.projects.filter(e=>e.project.id!==id);library.trash=[{...entry,deletedAt:Date.now()},...library.trash.filter(e=>e.project.id!==id)];
 if(!library.projects.some(e=>e.project.id===active.id))library.projects.unshift({project:active,updatedAt:Date.now()});library.activeId=active.id;return write(library,storage);
}
export function restoreLocalProject(id:string,storage:Store=localStorage){const library=readLocalLibrary(storage),entry=library.trash.find(e=>e.project.id===id);if(!entry)throw Error('This project is no longer in Recently deleted.');library.trash=library.trash.filter(e=>e.project.id!==id);library.projects.unshift({project:entry.project,updatedAt:entry.updatedAt});return write(library,storage);}
