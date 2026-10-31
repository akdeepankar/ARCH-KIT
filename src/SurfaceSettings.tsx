import {FinishSelect} from './ExteriorTab';
import {paletteExteriorColor} from './wallAppearance';
import type {Project,Floor,Room} from './model';
import {roomEdges,roomWallName} from './model';
import {paletteWallColor} from './wallAppearance';
export function ColorControl({label,value,custom,onChange}:{label:string;value:string;custom?:string;onChange:(value:string|null)=>void}){
 return <div className="surface-color-control"><label><span>{label}</span><input type="color" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/></label><div><input aria-label={label+' hex'} type="text" key={value} defaultValue={value} maxLength={7} onBlur={e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value)){if(e.target.value!==value)onChange(e.target.value)}else e.target.value=value}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/><button type="button" disabled={!custom} onClick={()=>onChange(null)} aria-label={'Reset '+label}>Reset</button></div></div>
}
export function RoomSurfaceSettings({project,floor,room,apply,applyFinish,activeSide}:{activeSide?:number;project:Project;floor:Floor;room:Room;apply:(edit:object)=>void;applyFinish:(edit:object)=>void}){
 const base=paletteWallColor(project),target={floorId:floor.id,roomId:room.id};
 return <div className="room-surface-settings"><p className="panel-description">Paint the inside of each wall separately. Exterior paint applies to exposed faces. Shared rooms keep their own interior colors.</p>
 <ColorControl label="All interior walls" value={room.wallColor||project.interiorColor||base} custom={room.wallColor||Object.values(room.wallColors||{})[0]} onChange={color=>apply({...target,target:'room-wall',color})}/>
 <ColorControl label="All exterior walls" value={room.exteriorColor||project.exteriorColor||paletteExteriorColor(project,room.exteriorFinish||project.finish)} custom={room.exteriorColor||Object.values(room.exteriorColors||{})[0]} onChange={color=>apply({...target,target:'room-exterior',color})}/>
 <FinishSelect label="Room façade finish" value={room.exteriorFinish||''} inherit={'Project default · '+project.finish} onChange={finish=>applyFinish({...target,target:'room',finish:finish||null})}/>
 {roomEdges(room).map(e=><details className="wall-color-details" key={e.side} open={activeSide===e.side||undefined}><summary>{roomWallName(room,e.side)}</summary><ColorControl label={roomWallName(room,e.side)+' interior'} value={room.wallColors?.[e.side]||room.wallColor||project.interiorColor||base} custom={room.wallColors?.[e.side]} onChange={color=>apply({...target,target:'room-wall',side:e.side,color})}/><ColorControl label={roomWallName(room,e.side)+' exterior'} value={room.exteriorColors?.[e.side]||room.exteriorColor||project.exteriorColor||paletteExteriorColor(project,room.exteriorFinishes?.[e.side]||room.exteriorFinish||project.finish)} custom={room.exteriorColors?.[e.side]} onChange={color=>apply({...target,target:'room-exterior',side:e.side,color})}/><FinishSelect label={roomWallName(room,e.side)+' façade finish'} value={room.exteriorFinishes?.[e.side]||''} inherit={'Inherit · '+(room.exteriorFinish||project.finish)} onChange={finish=>applyFinish({...target,target:'room-wall',side:e.side,finish:finish||null})}/></details>)}
 </div>
}
