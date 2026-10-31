import assert from 'node:assert/strict';
import {emptyProject} from '../src/model.ts';
import {LIBRARY_KEY,readLocalLibrary,saveLocalProject,deleteLocalProject,restoreLocalProject} from '../src/localProjects.ts';
const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const first=emptyProject();first.name='Existing residence';data.set('archkit.project.v1',JSON.stringify(first));
assert.equal(readLocalLibrary(storage).projects[0].project.id,first.id);
saveLocalProject(first,storage);const second=emptyProject();second.name='Second residence';saveLocalProject(second,storage);
assert.equal(readLocalLibrary(storage).projects.length,2);assert.equal(readLocalLibrary(storage).activeId,second.id);
first.name='Renamed residence';saveLocalProject(first,storage);assert.equal(readLocalLibrary(storage).projects.length,2);assert.equal(readLocalLibrary(storage).projects.find(e=>e.project.id===first.id).project.name,'Renamed residence');
deleteLocalProject(first.id,second,storage);let library=readLocalLibrary(storage);assert.equal(library.projects.length,1);assert.equal(library.activeId,second.id);assert.equal(library.trash[0].project.name,'Renamed residence');
restoreLocalProject(first.id,storage);library=readLocalLibrary(storage);assert.equal(library.projects.length,2);assert.equal(library.trash.length,0);assert.equal(library.activeId,second.id);
deleteLocalProject(second.id,first,storage);const replacement=emptyProject();deleteLocalProject(first.id,replacement,storage);library=readLocalLibrary(storage);assert.equal(library.projects.length,1);assert.equal(library.projects[0].project.id,replacement.id);assert.equal(library.trash.length,2);
// A valid empty library must never resurrect the old single-project key.
data.set(LIBRARY_KEY,JSON.stringify({version:1,activeId:null,projects:[],trash:[]}));assert.equal(readLocalLibrary(storage).projects.length,0);
const broken='{unreadable';data.set(LIBRARY_KEY,broken);assert.throws(()=>saveLocalProject(first,storage));assert.equal(data.get(LIBRARY_KEY),broken);
const full={getItem:storage.getItem,setItem:()=>{throw Error('Quota exceeded')}};data.delete(LIBRARY_KEY);assert.throws(()=>saveLocalProject(first,full),/Quota/);assert.equal(data.has(LIBRARY_KEY),false);
console.log('Local project migration, multi-project saves, rename, delete/restore, last-project fallback and storage failures passed.');
