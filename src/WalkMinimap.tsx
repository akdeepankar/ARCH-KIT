import {useId,useState} from 'react';
import type {RefObject} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';
import {Project,floorOf,roomWalls,wallPoint,roomPolygon,roomLabelBox} from './model';

type Props={project:Project;marker:RefObject<SVGGElement|null>;location:RefObject<HTMLSpanElement|null>;activeFloorId?:string};

export function WalkMinimap({project,marker,location,activeFloorId}:Props){
 const [collapsed,setCollapsed]=useState(false),contentId=useId();
 const floor=(activeFloorId&&project.floors.find(f=>f.id===activeFloorId))||floorOf(project);
 const size=Math.max(project.plot.w,project.plot.d),padding=size*.025;
 // The plan stays fixed; only the camera marker rotates and moves.
 const dot=size*.019,first=floor.rooms[0],x=first?roomLabelBox(first).x+roomLabelBox(first).w/2:project.plot.w/2,y=first?roomLabelBox(first).y+roomLabelBox(first).d/2:project.plot.d/2;
 return <aside className="walk-minimap" aria-label="Walkthrough minimap" data-testid="walk-minimap">
  <div className="minimap-heading"><span><i/>YOU ARE HERE</span><button type="button" aria-label={collapsed?'Expand location map':'Minimize location map'} title={collapsed?'Expand map':'Minimize map'} aria-expanded={!collapsed} aria-controls={contentId} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button></div>
  <div id={contentId} className="minimap-content" hidden={collapsed}>
  <div className="minimap-plan">
   <svg role="img" aria-label={`Live position on ${floor.name} floor plan`} viewBox={`${-padding} ${-padding} ${project.plot.w+padding*2} ${project.plot.d+padding*2}`}>
    <rect x="0" y="0" width={project.plot.w} height={project.plot.d} fill="#efefef" stroke="#c8c8c8" strokeWidth={size*.003}/>
    {floor.exteriors.map(e=><rect key={e.id} x={e.x} y={e.y} width={e.w} height={e.d} fill="#dadada" stroke="#808080" strokeWidth={size*.002}/>)}
    {floor.rooms.map(r=>{const label=roomLabelBox(r);return <g key={r.id}><polygon points={roomPolygon(r)} fill={r.color} fillOpacity=".85"/>{label.w>5&&label.d>5&&<text x={label.x+label.w/2} y={label.y+label.d/2+.3} textAnchor="middle" fill="#555555" fontSize={Math.min(size*.015,label.w*.09)}>{r.name}</text>}</g>})}
    {roomWalls(floor).map((w,i)=><line key={i} x1={w.x} y1={w.y} x2={w.x2} y2={w.y2} stroke="#565656" strokeWidth={size*.005} strokeLinecap="square"/>)}
    {floor.walls.map(w=><line key={w.id} x1={w.x} y1={w.y} x2={w.x2} y2={w.y2} stroke="#565656" strokeWidth={Math.max(w.thickness,size*.004)}/>)}
    {floor.openings.map(o=>{const r=floor.rooms.find(r=>r.id===o.roomId);if(!r)return null;const[a,b]=wallPoint(r,o.side,o.offset),[c,d]=wallPoint(r,o.side,o.offset+o.width);return <line key={o.id} x1={a} y1={b} x2={c} y2={d} stroke={o.kind!=='window'?'#f9f9f9':'#7f7f7f'} strokeWidth={size*.007}/>})}
    {floor.stairs.map(s=>{const rot=((s.rotation||0)%360+360)%360,isHoriz=rot===90||rot===270;return <g key={s.id}><rect x={s.x} y={s.y} width={s.w} height={s.d} fill="#cccccc" stroke="#737373" strokeWidth={size*.003}/>{Array.from({length:8},(_,i)=>isHoriz?<path key={i} d={`M ${s.x+s.w*i/8} ${s.y} v ${s.d}`} stroke="#7a7a7a" strokeWidth={size*.002}/>:<path key={i} d={`M ${s.x} ${s.y+s.d*i/8} h ${s.w}`} stroke="#7a7a7a" strokeWidth={size*.002}/>)}</g>})}
    <g ref={marker} data-testid="walk-position" transform={`translate(${x} ${y}) rotate(-180)`}>
     <path d={`M 0 0 L ${-dot*3.1} ${-dot*5.5} Q 0 ${-dot*7} ${dot*3.1} ${-dot*5.5} Z`} fill="#636363" fillOpacity=".15"/>
     <circle r={dot*1.9} fill="#ffffff" fillOpacity=".7"/>
     <circle r={dot} fill="#636363" stroke="#fdfdfd" strokeWidth={dot*.28}/>
     <path d={`M 0 ${-dot*2.4} L ${-dot*.65} ${-dot*1.35} H ${dot*.65} Z`} fill="#636363" stroke="#fdfdfd" strokeWidth={dot*.12}/>
    </g>
   </svg>
   <span className="minimap-north" title="North" style={{transform:`rotate(${[0,-90,180,90][['North','East','South','West'].indexOf(project.plot.front)]}deg)`}}>N ↑</span>
  </div>
  <div className="minimap-location"><strong>{floor.name}</strong><span ref={location}>{first?.name||'Outdoor / site'}</span></div>
  </div>
 </aside>
}
