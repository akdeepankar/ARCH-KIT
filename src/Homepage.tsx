'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ArrowRight,Pause,Play,RotateCcw,MoveUpRight,Sun,Moon,Layers,Sparkles,Compass} from 'lucide-react';
import type {CSSProperties} from 'react';
import './homepage.css';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const spring=(n:number)=>{const t=clamp(n);return 1-Math.pow(1-t,3);};

type ThemeMode='day'|'dusk';

interface RoomDef {
  id:string;
  name:string;
  tag:string;
  area:string;
  desc:string;
  x:number;
  z:number;
  w:number;
  d:number;
  fillDay:string;
  fillDusk:string;
}

const ROOMS:RoomDef[]=[
  {id:'living',name:'LIVING PAVILION',tag:'01',area:'420 SF',desc:'10.5′ ceilings · Southern exposure · Seamless deck opening',x:0,z:20,w:160,d:120,fillDay:'#e8eee4',fillDusk:'#1e2621'},
  {id:'dining',name:'KITCHEN & DINING',tag:'02',area:'240 SF',desc:'Monolithic island · Concealed pantry · Breakfast nook',x:160,z:20,w:120,d:85,fillDay:'#f4eee2',fillDusk:'#2a231b'},
  {id:'suite',name:'PRIMARY SUITE',tag:'03',area:'320 SF',desc:'Integrated bath · Private teak deck · Garden views',x:160,z:105,w:120,d:135,fillDay:'#e2ebed',fillDusk:'#1c2328'},
  {id:'studio',name:'CREATIVE STUDIO',tag:'04',area:'280 SF',desc:'High clerestory north light · Built-in library & drafting desk',x:0,z:140,w:160,d:100,fillDay:'#eeeae0',fillDusk:'#252320'},
];

interface Hotspot {
  id:string;
  title:string;
  detail:string;
  x:number;
  z:number;
  h:number;
}

const HOTSPOTS:Hotspot[]=[
  {id:'roof',title:'Floating Cantilever Roof',detail:'Ultra-thin steel fascia with warm cedar timber soffit',x:140,z:20,h:102},
  {id:'glazing',title:'Floor-to-Ceiling Glazing',detail:'Minimalist double-glazed low-iron sliding panels',x:60,z:240,h:50},
  {id:'pool',title:'Sunken Reflection Lap Pool',detail:'Integrated waterline coping with emerald shimmer',x:-35,z:100,h:0},
  {id:'louvers',title:'Teak Brise-Soleil Louvers',detail:'Architectural privacy slats regulating afternoon sun',x:220,z:240,h:45},
];

function PlanBuilding({
  progress,
  theme,
  activeRoom,
  onRoomSelect,
  activeHotspot,
  onHotspotSelect,
  parallax
}:{
  progress:number;
  theme:ThemeMode;
  activeRoom:string|null;
  onRoomSelect:(id:string|null)=>void;
  activeHotspot:string|null;
  onHotspotSelect:(id:string|null)=>void;
  parallax:{x:number;y:number};
}){
  // Multi-phase smooth parametric interpolation
  const tilt=smooth(progress/.34);
  const wallProgress=clamp((progress-.10)/.55);
  const height=92*spring(wallProgress);
  const roofProgress=clamp((progress-.68)/.32);
  const roof=smooth(roofProgress);
  const labels=1-smooth((progress-.03)/.30);
  const laserProgress=clamp((progress-.12)/.62);
  const showLaser=wallProgress>.02&&wallProgress<.96;

  // Axonometric architectural projection mapping with subtle mouse parallax depth
  const point=(x:number,z:number,h=0):[number,number]=>{
    const p2x=245+x*.95;
    const p2y=138+z*.95;
    const p3x=405+(x-z)*.87+parallax.x*tilt*.6;
    const p3y=215+(x+z)*.44-h+parallax.y*tilt*.6;
    return[p2x*(1-tilt)+p3x*tilt,p2y*(1-tilt)+p3y*tilt];
  };

  const pts=(values:number[][])=>values.map(([x,z,h])=>point(x,z,h||0).join(',')).join(' ');
  const rect=(x:number,z:number,w:number,d:number,h=0)=>pts([[x,z,h],[x+w,z,h],[x+w,z+d,h],[x,z+d,h]]);

  // Wall faces with directional architectural lighting
  const wallPoly=(x1:number,z1:number,x2:number,z2:number,fill:string,stroke:string,key:string)=>(
    <polygon key={key} points={pts([[x1,z1,0],[x2,z2,0],[x2,z2,height],[x1,z1,height]])} fill={fill} stroke={stroke} strokeWidth=".85" strokeLinejoin="round"/>
  );

  // Modern floor-to-ceiling glass panel with specular gleam
  const glassPanel=(x1:number,z1:number,x2:number,z2:number,key:string)=>{
    const glowFill=theme==='dusk'?'url(#glass-glow-dusk)':'url(#glass-gleam-day)';
    const frameStroke=theme==='dusk'?'#1a1f26':'#242930';
    return (
      <g key={key} opacity={tilt}>
        <polygon points={pts([[x1,z1,height*.08],[x2,z2,height*.08],[x2,z2,height*.88],[x1,z1,height*.88]])} fill={glowFill} stroke={frameStroke} strokeWidth="1.2"/>
        <line x1={point(x1,z1,height*.15)[0]} y1={point(x1,z1,height*.15)[1]} x2={point(x2,z2,height*.8)[0]} y2={point(x2,z2,height*.8)[1]} stroke="#ffffff" strokeWidth=".7" opacity={theme==='dusk'?.3:.6}/>
        <line x1={point(x1,z1,height*.25)[0]} y1={point(x1,z1,height*.25)[1]} x2={point(x2,z2,height*.9)[0]} y2={point(x2,z2,height*.9)[1]} stroke="#ffffff" strokeWidth=".4" opacity={theme==='dusk'?.2:.4}/>
      </g>
    );
  };

  // Modern vertical cedar louvers
  const louvers=(x1:number,z1:number,x2:number,z2:number,count:number,key:string)=>{
    const bars=[];
    for(let i=0;i<count;i++){
      const t=i/(count-1);
      const lx=x1+(x2-x1)*t,lz=z1+(z2-z1)*t;
      bars.push(<line key={i} x1={point(lx,lz,0)[0]} y1={point(lx,lz,0)[1]} x2={point(lx,lz,height*.92)[0]} y2={point(lx,lz,height*.92)[1]} stroke={theme==='dusk'?'#d49755':'#b87937'} strokeWidth="1.4" opacity={tilt}/>);
    }
    return <g key={key}>{bars}</g>;
  };

  const isDusk=theme==='dusk';
  const strokeLine=isDusk?'#384350':'#667362';
  const blueprintText=isDusk?'#8da0b5':'#5a6755';
  const laserZ=20+laserProgress*220;

  return (
    <svg className="home-building" viewBox="80 50 640 500" role="img" aria-label={`Interactive architectural 3D concept preview, ${Math.round(progress*100)} percent built`}>
      <defs>
        {/* Precise technical drafting grid */}
        <pattern id="arch-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 H 0 V 28" fill="none" stroke={isDusk?'#1c222a':'#ebebe6'} strokeWidth=".6"/>
          <circle cx="28" cy="28" r=".7" fill={isDusk?'#2e3744':'#c4c4be'}/>
          <path d="M 0 14 H 2 M 26 14 H 28 M 14 0 V 2 M 14 26 V 28" stroke={isDusk?'#262f3a':'#d9d9d3'} strokeWidth=".4"/>
        </pattern>

        {/* Ambient occlusion shadow */}
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="16"/>
        </filter>
        <filter id="laser-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
        <filter id="dusk-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12"/>
        </filter>

        {/* Shading gradients */}
        <linearGradient id="wall-south" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDusk?'#5a4f44':'#faf8f3'}/>
          <stop offset="100%" stopColor={isDusk?'#342e29':'#eee9df'}/>
        </linearGradient>
        <linearGradient id="wall-east" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDusk?'#473f38':'#ede9df'}/>
          <stop offset="100%" stopColor={isDusk?'#2b2723':'#ded9cc'}/>
        </linearGradient>
        <linearGradient id="wall-west" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isDusk?'#38322e':'#dcd7cc'}/>
          <stop offset="100%" stopColor={isDusk?'#221f1c':'#c5c0b4'}/>
        </linearGradient>
        <linearGradient id="wall-feature" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDusk?'#1f242c':'#32373f'}/>
          <stop offset="100%" stopColor={isDusk?'#12151a':'#1f2328'}/>
        </linearGradient>

        {/* Glass finishes */}
        <linearGradient id="glass-gleam-day" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a3d5e8" stopOpacity=".75"/>
          <stop offset="45%" stopColor="#d5eff7" stopOpacity=".85"/>
          <stop offset="70%" stopColor="#87c6dc" stopOpacity=".65"/>
          <stop offset="100%" stopColor="#5eaec6" stopOpacity=".75"/>
        </linearGradient>
        <linearGradient id="glass-glow-dusk" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffb03a" stopOpacity=".95"/>
          <stop offset="50%" stopColor="#ffd875" stopOpacity=".9"/>
          <stop offset="100%" stopColor="#ff8c1a" stopOpacity=".85"/>
        </linearGradient>

        {/* Shimmering pool water */}
        <linearGradient id="pool-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDusk?'#0a3a47':'#208ca7'}/>
          <stop offset="50%" stopColor={isDusk?'#12586b':'#35a9c7'}/>
          <stop offset="100%" stopColor={isDusk?'#092f39':'#1b768e'}/>
        </linearGradient>

        {/* Roof finish */}
        <linearGradient id="roof-slab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDusk?'#2f363f':'#f5f4ef'}/>
          <stop offset="100%" stopColor={isDusk?'#1b2026':'#e4e1d7'}/>
        </linearGradient>
        <linearGradient id="wood-soffit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDusk?'#a4662d':'#d79e5b'}/>
          <stop offset="100%" stopColor={isDusk?'#744319':'#b07535'}/>
        </linearGradient>

        {/* Glowing laser sweep */}
        <linearGradient id="laser-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0"/>
          <stop offset="30%" stopColor="#00e5ff" stopOpacity=".9"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="70%" stopColor="#00e5ff" stopOpacity=".9"/>
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Grid background */}
      <rect x="80" y="50" width="640" height="500" fill="url(#arch-grid)"/>

      {/* Volumetric drop shadow under structure */}
      <ellipse cx={405+tilt*20} cy={375+tilt*35} rx={160+tilt*70} ry={38+tilt*12} fill={isDusk?'#000000':'#2d352b'} opacity={isDusk?.45:.14} filter="url(#soft-shadow)"/>

      {/* Outer site terrace and ground plinth */}
      <polygon points={rect(-65,10,365,245,-8)} fill={isDusk?'#14191f':'#f4f3ed'} stroke={isDusk?'#222a35':'#dad8ce'} strokeWidth="1.2"/>
      <polygon points={rect(-65,10,365,245,-2)} fill={isDusk?'#171d24':'#fbfaf5'} stroke={isDusk?'#26303d':'#e5e3d9'} strokeWidth="1"/>

      {/* Sunken Reflection Pool & stepping stones */}
      <g>
        <polygon points={rect(-55,30,45,150,-2)} fill={isDusk?'#081820':'#1c3842'} stroke={isDusk?'#152835':'#7aa4b2'} strokeWidth="1"/>
        <polygon points={rect(-53,32,41,146,-5)} fill="url(#pool-water)"/>
        {/* Pool underwater light glow at dusk */}
        {isDusk&&<ellipse cx={point(-32,105,-4)[0]} cy={point(-32,105,-4)[1]} rx="45" ry="18" fill="#00d9ff" opacity=".35" filter="url(#dusk-glow)"/>}
        {/* Modern stone coping & pool steps */}
        <polygon points={rect(-55,30,45,6,-1)} fill={isDusk?'#262f3a':'#eae8de'}/>
        <polygon points={rect(-55,174,45,6,-1)} fill={isDusk?'#262f3a':'#eae8de'}/>
        <polygon points={rect(-51,45,37,18,-4)} fill={isDusk?'#1a3d47':'#3fa9c4'} opacity=".6"/>
        {/* Stepping stones to garden */}
        <polygon points={rect(-50,195,35,22,-1)} fill={isDusk?'#262f3a':'#e4e1d7'} stroke={isDusk?'#343e4c':'#cac7bc'} strokeWidth=".8"/>
        <polygon points={rect(-50,225,35,22,-1)} fill={isDusk?'#262f3a':'#e4e1d7'} stroke={isDusk?'#343e4c':'#cac7bc'} strokeWidth=".8"/>
      </g>

      {/* Timber entrance & terrace decking */}
      <polygon points={rect(-55,10,45,18,-1)} fill={isDusk?'#55381f':'#c99a61'} stroke={isDusk?'#422914':'#ab7e47'} strokeWidth=".8"/>
      <polygon points={rect(100,240,40,15,-1)} fill={isDusk?'#55381f':'#c99a61'} stroke={isDusk?'#422914':'#ab7e47'} strokeWidth=".8"/>

      {/* Room Floor Plates */}
      {ROOMS.map(r=>{
        const isHovered=activeRoom===r.id;
        const fill=isDusk?r.fillDusk:r.fillDay;
        const strokeColor=isHovered?'#00d4ff':strokeLine;
        const strokeW=isHovered?2.6:1.4;
        return (
          <g key={r.id} className="home-room-group" onMouseEnter={()=>onRoomSelect(r.id)} onMouseLeave={()=>onRoomSelect(null)}>
            <polygon points={rect(r.x,r.z,r.w,r.d,0)} fill={fill} stroke={strokeColor} strokeWidth={strokeW} strokeLinejoin="round"/>
            {/* Blueprint Room Labels */}
            <g opacity={labels}>
              <text x={point(r.x+r.w/2,r.z+r.d/2-10)[0]} y={point(r.x+r.w/2,r.z+r.d/2-10)[1]} textAnchor="middle" fill={blueprintText} fontSize="8" fontWeight="600" letterSpacing="1.8">{r.tag} · {r.name}</text>
              <text x={point(r.x+r.w/2,r.z+r.d/2+10)[0]} y={point(r.x+r.w/2,r.z+r.d/2+10)[1]} textAnchor="middle" fill={blueprintText} fontSize="7.5" opacity=".75" letterSpacing="1">{r.area}</text>
            </g>
          </g>
        );
      })}

      {/* Blueprint Minimalist Furniture & Schematics (fades as walls rise) */}
      <g opacity={labels*(1-roof)} stroke={isDusk?'#3a4858':'#8e9d89'} fill="none" strokeWidth=".9">
        {/* Living sofa */}
        <polygon points={rect(20,40,75,32,1)} fill={isDusk?'#20262e':'#e8eae1'}/>
        <polygon points={rect(22,42,71,10,2)} fill={isDusk?'#262e38':'#dde0d5'}/>
        <polygon points={rect(38,82,45,25,1)} fill={isDusk?'#1b2128':'#f3f2eb'} strokeDasharray="3 2"/>
        {/* Kitchen island & barstools */}
        <polygon points={rect(180,38,80,26,1)} fill={isDusk?'#2d2720':'#ede6db'}/>
        <circle cx={point(195,74,1)[0]} cy={point(195,74,1)[1]} r="4.5" fill={isDusk?'#3a3229':'#dfd5c5'}/>
        <circle cx={point(220,74,1)[0]} cy={point(220,74,1)[1]} r="4.5" fill={isDusk?'#3a3229':'#dfd5c5'}/>
        <circle cx={point(245,74,1)[0]} cy={point(245,74,1)[1]} r="4.5" fill={isDusk?'#3a3229':'#dfd5c5'}/>
        {/* Bedroom platform bed & nightstands */}
        <polygon points={rect(185,135,70,80,1)} fill={isDusk?'#1e252d':'#e4ecf0'}/>
        <polygon points={rect(190,138,60,20,2)} fill={isDusk?'#28313c':'#f6f9fa'}/>
        <polygon points={rect(168,138,14,18,1)} fill={isDusk?'#232b35':'#d5dfe4'}/>
        <polygon points={rect(258,138,14,18,1)} fill={isDusk?'#232b35':'#d5dfe4'}/>
        {/* Studio drafting table */}
        <polygon points={rect(25,165,85,32,1)} fill={isDusk?'#262420':'#ede8de'}/>
        <line x1={point(25,185,1)[0]} y1={point(25,185,1)[1]} x2={point(110,185,1)[1]} strokeDasharray="2 2"/>
        {/* Door swing arcs */}
        <path d={`M ${point(102,240)[0]} ${point(102,240)[1]} A 30 30 0 0 1 ${point(132,240)[0]} ${point(132,240)[1]}`} strokeDasharray="2 2"/>
        <line x1={point(102,240)[0]} y1={point(102,240)[1]} x2={point(102,212)[0]} y2={point(102,212)[1]} strokeWidth="1.2"/>
      </g>

      {/* Blueprint Dimension Strings & Callouts */}
      <g stroke={blueprintText} fill="none" strokeWidth=".7" opacity={labels}>
        {/* Top overall dimension */}
        <path d={`M ${point(0,10)[0]} ${point(0,10)[1]} L ${point(280,10)[0]} ${point(280,10)[1]}`}/>
        <path d={`M ${point(0,6)[0]} ${point(0,6)[1]} L ${point(0,14)[0]} ${point(0,14)[1]}`}/>
        <path d={`M ${point(280,6)[0]} ${point(280,6)[1]} L ${point(280,14)[0]} ${point(280,14)[1]}`}/>
        <text x={point(140,4)[0]} y={point(140,4)[1]} textAnchor="middle" stroke="none" fill={blueprintText} fontSize="9" fontWeight="500">28′ — 0″</text>

        {/* Left overall dimension */}
        <path d={`M ${point(-10,20)[0]} ${point(-10,20)[1]} L ${point(-10,240)[0]} ${point(-10,240)[1]}`}/>
        <path d={`M ${point(-14,20)[0]} ${point(-14,20)[1]} L ${point(-6,20)[0]} ${point(-6,20)[1]}`}/>
        <path d={`M ${point(-14,240)[0]} ${point(-14,240)[1]} L ${point(-6,240)[0]} ${point(-6,240)[1]}`}/>
        <text x={point(-18,130)[0]} y={point(-18,130)[1]} textAnchor="middle" stroke="none" fill={blueprintText} fontSize="9" fontWeight="500" transform={`rotate(-90 ${point(-18,130)[0]} ${point(-18,130)[1]})`}>22′ — 0″</text>
      </g>

      {/* Architectural Digital Twin Laser Scan Line */}
      {showLaser&&(
        <g opacity={Math.sin(laserProgress*Math.PI)}>
          <polygon points={pts([[-60,laserZ,0],[300,laserZ,0],[300,laserZ,height],[-60,laserZ,height]])} fill="url(#laser-beam)" opacity=".45" filter="url(#laser-blur)"/>
          <line x1={point(-60,laserZ,0)[0]} y1={point(-60,laserZ,0)[1]} x2={point(300,laserZ,0)[0]} y2={point(300,laserZ,0)[1]} stroke="#00e5ff" strokeWidth="2.5"/>
          <line x1={point(-60,laserZ,height)[0]} y1={point(-60,laserZ,height)[1]} x2={point(300,laserZ,height)[0]} y2={point(300,laserZ,height)[1]} stroke="#00e5ff" strokeWidth="2"/>
        </g>
      )}

      {/* 3D Parametric Guide Wireframe Lines */}
      {wallProgress>.04&&wallProgress<.95&&(
        <g opacity={(1-roof)*.7} stroke="#00d4ff" strokeWidth=".8" strokeDasharray="3 3">
          <line x1={point(0,20,0)[0]} y1={point(0,20,0)[1]} x2={point(0,20,height)[0]} y2={point(0,20,height)[1]}/>
          <line x1={point(280,20,0)[0]} y1={point(280,20,0)[1]} x2={point(280,20,height)[0]} y2={point(280,20,height)[1]}/>
          <line x1={point(280,240,0)[0]} y1={point(280,240,0)[1]} x2={point(280,240,height)[0]} y2={point(280,240,height)[1]}/>
          <line x1={point(0,240,0)[0]} y1={point(0,240,0)[1]} x2={point(0,240,height)[0]} y2={point(0,240,height)[1]}/>
          <circle cx={point(0,20,height)[0]} cy={point(0,20,height)[1]} r="2" fill="#00d4ff"/>
          <circle cx={point(280,240,height)[0]} cy={point(280,240,height)[1]} r="2" fill="#00d4ff"/>
        </g>
      )}

      {/* 3D Extruded Walls */}
      <g opacity={tilt}>
        {/* North feature charcoal wall */}
        {wallPoly(0,20,280,20,'url(#wall-feature)','#181d24','north-wall')}

        {/* West textured stucco wall */}
        {wallPoly(0,20,0,240,'url(#wall-west)',isDusk?'#1c2026':'#b5b0a3','west-wall')}

        {/* Internal partition walls */}
        {wallPoly(160,20,160,84,isDusk?'#342e29':'#e8e4da',isDusk?'#26221e':'#ccc7bb','part-1')}
        {wallPoly(160,116,160,240,isDusk?'#342e29':'#e8e4da',isDusk?'#26221e':'#ccc7bb','part-2')}
        {wallPoly(0,140,65,140,isDusk?'#302b26':'#e6e1d6',isDusk?'#26221e':'#ccc7bb','part-3')}
        {wallPoly(95,140,160,140,isDusk?'#302b26':'#e6e1d6',isDusk?'#26221e':'#ccc7bb','part-4')}
        {wallPoly(160,105,280,105,isDusk?'#342e29':'#e8e4da',isDusk?'#26221e':'#ccc7bb','part-5')}

        {/* East wall with clerestory ribbon */}
        {wallPoly(280,20,280,240,'url(#wall-east)',isDusk?'#201c18':'#bfb9ab','east-wall')}
        {glassPanel(280,45,280,95,'east-window-1')}
        {glassPanel(280,135,280,215,'east-window-2')}

        {/* South front facade: floor-to-ceiling glass & entrance */}
        {wallPoly(0,240,24,240,'url(#wall-south)',isDusk?'#26221e':'#cac4b6','south-corner')}
        {glassPanel(24,240,96,240,'south-living-glass')}
        {wallPoly(96,240,102,240,'url(#wall-feature)',isDusk?'#181d24':'#242930','south-mullion')}

        {/* Main entry door */}
        <polygon points={pts([[102,240,0],[102,216,0],[102,216,height*.85],[102,240,height*.85]])} fill={isDusk?'#744a22':'#a46c35'} stroke="#2a1d12" strokeWidth=".8"/>

        {/* South bedroom facade & louvers */}
        {wallPoly(132,240,165,240,'url(#wall-south)',isDusk?'#26221e':'#cac4b6','south-mid')}
        {glassPanel(165,240,235,240,'south-bedroom-glass')}
        {louvers(165,240,235,240,7,'bedroom-louvers')}
        {wallPoly(235,240,280,240,'url(#wall-south)',isDusk?'#26221e':'#cac4b6','south-end')}

        {/* Lintel bar above entrance */}
        <polygon points={pts([[102,240,height*.85],[132,240,height*.85],[132,240,height],[102,240,height]])} fill={isDusk?'#1b2128':'#262b32'}/>
      </g>

      {/* Floating Cantilever Roof Structure */}
      <g opacity={roof} style={{transform:`translateY(${(1-roof)*-32}px)`}}>
        {/* Warm wood timber soffit underside */}
        <polygon points={rect(-12,8,304,244,height+1)} fill="url(#wood-soffit)"/>

        {/* Main floating roof slab */}
        <polygon points={rect(-12,8,304,244,height+8)} fill="url(#roof-slab)" stroke={isDusk?'#12161a':'#828d7a'} strokeWidth="1.2"/>

        {/* Front & side fascia edges */}
        <polygon points={pts([[-12,252,height+1],[292,252,height+1],[292,252,height+8],[-12,252,height+8]])} fill={isDusk?'#11151a':'#3a4336'}/>
        <polygon points={pts([[292,8,height+1],[292,252,height+1],[292,252,height+8],[292,8,height+8]])} fill={isDusk?'#0c0f12':'#2a3127'}/>

        {/* Recessed clerestory skylight slit */}
        <polygon points={rect(30,35,90,45,height+9)} fill={isDusk?'#ffa02a':'#9bd0e4'} stroke={isDusk?'#d47c17':'#629eb5'} strokeWidth="1.4" opacity=".85"/>
        <line x1={point(30,57,height+9)[0]} y1={point(30,57,height+9)[1]} x2={point(120,57,height+9)[0]} y2={point(120,57,height+9)[1]} stroke={isDusk?'#ffca7a':'#ffffff'} strokeWidth="1"/>

        {/* Sedum green roof / solar panel feature */}
        <polygon points={rect(170,120,80,65,height+9)} fill={isDusk?'#1f2824':'#a9baa2'} stroke={isDusk?'#2a3530':'#86967f'} strokeWidth="1"/>
        {[0,1,2,3].map(i=>(
          <line key={i} x1={point(170,120+i*16,height+9)[0]} y1={point(170,120+i*16,height+9)[1]} x2={point(250,120+i*16,height+9)[0]} y2={point(250,120+i*16,height+9)[1]} stroke={isDusk?'#2c3933':'#76856f'} strokeWidth=".9"/>
        ))}
      </g>

      {/* Interactive Architectural Hotspot Pins (appear at finished stage) */}
      {roof>.7&&HOTSPOTS.map(h=>{
        const pos=point(h.x,h.z,h.h);
        const isSelected=activeHotspot===h.id;
        return (
          <g key={h.id} className="home-hotspot-pin" onClick={()=>onHotspotSelect(isSelected?null:h.id)} onMouseEnter={()=>onHotspotSelect(h.id)} onMouseLeave={()=>onHotspotSelect(null)} style={{cursor:'pointer'}}>
            <circle cx={pos[0]} cy={pos[1]} r={isSelected?9:6} fill={isDusk?'#00e5ff':'#252525'} stroke="#ffffff" strokeWidth="2" opacity=".95"/>
            <circle cx={pos[0]} cy={pos[1]} r={isSelected?14:10} fill="none" stroke={isDusk?'#00e5ff':'#252525'} strokeWidth="1" strokeDasharray="2 2" opacity=".6" className="home-pin-pulse"/>
            <text x={pos[0]} y={pos[1]+3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700" pointerEvents="none">+</text>
          </g>
        );
      })}

      {/* Compass Rose */}
      <g transform="translate(670 95)" stroke={isDusk?'#5a6b7d':'#67765b'} fill="none">
        <circle cx="0" cy="0" r="14" strokeWidth=".8" strokeDasharray="2 2"/>
        <path d="M 0 16 V -7 L -4 1 M 0 -7 L 4 1" strokeWidth="1.2"/>
        <text x="0" y="-14" fill={isDusk?'#8da0b5':'#67765b'} stroke="none" textAnchor="middle" fontSize="9" fontWeight="700">348° N</text>
      </g>
    </svg>
  );
}

export default function Homepage(){
  const [progress,setProgress]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [theme,setTheme]=useState<ThemeMode>('day');
  const [reduced,setReduced]=useState(false);
  const [activeRoom,setActiveRoom]=useState<string|null>(null);
  const [activeHotspot,setActiveHotspot]=useState<string|null>(null);
  const [parallax,setParallax]=useState({x:0,y:0,rotX:0,rotY:0});
  const clock=useRef(0);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{
      setReduced(media.matches);
      if(media.matches){setPlaying(false);setProgress(.65);}
    };
    update();
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    if(!playing||reduced)return;
    let raf=0,last=0;
    const frame=(now:number)=>{
      if(last)clock.current+=Math.min((now-last)/1000,.1);
      last=now;
      // 12-second cycle: 0-1s pause on plan, 1-7s rise, 7-10s finished showcase, 10-12s rewind
      const cycle=clock.current%12;
      setProgress(cycle<1?0:cycle<7?(cycle-1)/6:cycle<10?1:1-smooth((cycle-10)/2));
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    return()=>cancelAnimationFrame(raf);
  },[playing,reduced]);

  const change=(value:number)=>{
    setPlaying(false);
    setProgress(value);
    clock.current=1+6*value;
  };

  const handleMouseMove=(e:React.MouseEvent<HTMLDivElement>)=>{
    if(reduced)return;
    const rect=e.currentTarget.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width-.5)*2;
    const y=((e.clientY-rect.top)/rect.height-.5)*2;
    setParallax({x:x*16,y:y*12,rotX:-y*3.8,rotY:x*5.2});
  };

  const handleMouseLeave=()=>{
    setParallax({x:0,y:0,rotX:0,rotY:0});
  };

  const stageNumber=progress<.22?'01':progress<.75?'02':'03';
  const stageName=progress<.22?'Precision Floor Plan':progress<.75?'Parametric BIM Rise':'Realized Residence';
  const stageSub=progress<.22?'Scale 1:50 · 1,420 sq ft · 4 zones':progress<.75?`Extruding · ${Math.round(progress*92*0.1)}′ ceiling`:theme==='dusk'?'Golden Dusk Lighting · 348° NNW':'Daylight Studio · High-Performance Shell';

  const currentHotspotInfo=activeHotspot?HOTSPOTS.find(h=>h.id===activeHotspot):null;
  const currentRoomInfo=activeRoom?ROOMS.find(r=>r.id===activeRoom):null;

  return (
    <main className={`home-page ${theme==='dusk'?'theme-dusk':''}`}>
      <header className="home-nav">
        <a className="home-brand" href="/" aria-label="ArchKit home">
          <svg width="30" height="32" viewBox="0 0 30 32" fill="none" aria-hidden="true">
            <path d="M3 12 15 3l12 9v16H3V12Z M8 28V15l7-5 7 5v13 M15 10v18 M3 12l12 9 12-9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span>ArchKit<span className="home-brand-dot">.</span></span>
        </a>
        <div className="home-nav-badge">
          <span className="home-nav-indicator"/>
          <span>Studio 2.0 Live · Parametric CAD & BIM</span>
        </div>
        <a className="home-nav-studio" href="/studio">Open Studio <ArrowUpRight size={15}/></a>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <div className="home-eyebrow">
            <span className="home-eyebrow-dot"/>
            NEXT-GEN ARCHITECTURAL DESIGN
          </div>
          <h1 id="home-title">From a plan.<br/> To a <em>place.</em></h1>
          <p>
            Sketch the way you want to live.<br className="home-desktop-break"/>
            Watch it rise in real-time 3D, walk through every level, and render with intelligence.
          </p>
          <div className="home-cta-group">
            <a className="home-primary" href="/studio">Start Designing <ArrowUpRight size={19}/></a>
            <div className="home-hero-specs">
              <div><strong>1:50</strong><span>Real CAD Scale</span></div>
              <div className="home-spec-divider"/>
              <div><strong>60 FPS</strong><span>Walkthrough 3D</span></div>
              <div className="home-spec-divider"/>
              <div><strong>BIM</strong><span>Multi-Floor Treads</span></div>
            </div>
          </div>
          <div className="home-small-note">
            <span className="home-note-line"/>
            Your ideas. Your exact dimensions. Your home.
          </div>
        </div>

        <div
          className="home-demo"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform:reduced?'none':`perspective(1000px) rotateX(${parallax.rotX}deg) rotateY(${parallax.rotY}deg)`
          }}
        >
          <div className="home-demo-top">
            <div className="home-demo-status">
              <span className="home-live-pulse"/>
              <span>INTERACTIVE CONCEPT PREVIEW</span>
              <span className="home-demo-chip">{stageNumber} / 03</span>
            </div>
            <div className="home-demo-actions">
              <button
                type="button"
                className={`home-theme-toggle ${theme==='dusk'?'is-dusk':''}`}
                onClick={()=>setTheme(t=>t==='day'?'dusk':'day')}
                aria-label={theme==='day'?'Switch to Golden Dusk lighting':'Switch to Daylight Studio lighting'}
                title={theme==='day'?'Switch to Golden Dusk':'Switch to Daylight Studio'}
              >
                {theme==='day'?<Sun size={13}/>:<Moon size={13}/>}
                <span>{theme==='day'?'Daylight':'Dusk'}</span>
              </button>
            </div>
          </div>

          <div className="home-scene">
            <PlanBuilding
              progress={progress}
              theme={theme}
              activeRoom={activeRoom}
              onRoomSelect={setActiveRoom}
              activeHotspot={activeHotspot}
              onHotspotSelect={setActiveHotspot}
              parallax={parallax}
            />

            {/* Dynamic floating architectural callout tooltip */}
            {currentHotspotInfo&&(
              <div className="home-hotspot-card">
                <Sparkles size={13} className="home-hotspot-sparkle"/>
                <div>
                  <strong>{currentHotspotInfo.title}</strong>
                  <span>{currentHotspotInfo.detail}</span>
                </div>
              </div>
            )}

            {/* Dynamic room preview card */}
            {currentRoomInfo&&(
              <div className="home-room-card">
                <Layers size={12}/>
                <div>
                  <strong>{currentRoomInfo.name} · {currentRoomInfo.area}</strong>
                  <span>{currentRoomInfo.desc}</span>
                </div>
              </div>
            )}

            <div className="home-scene-caption">
              <span className="home-caption-sub">MODERN PAVILION RESIDENCE</span>
              <strong>A single sketch.<br/>An entirely new dimension.</strong>
            </div>

            <div className="home-scene-tag">
              <MoveUpRight size={12}/>
              <span>{Math.round(progress*100)}% ASSEMBLED</span>
            </div>
          </div>

          <div className="home-demo-controls">
            <div className="home-demo-state">
              <span className="home-stage-badge">{stageNumber}</span>
              <div className="home-state-text">
                <strong>{stageName}</strong>
                <small>{stageSub}</small>
              </div>
              <div className="home-state-buttons">
                <button
                  type="button"
                  className="home-animation-button"
                  aria-label={playing?'Pause preview animation':'Play preview animation'}
                  aria-pressed={playing}
                  onClick={()=>setPlaying(v=>!v)}
                  title={playing?'Pause':'Play'}
                >
                  {playing?<Pause size={14}/>:<Play size={14}/>}
                </button>
                <button
                  type="button"
                  className="home-animation-button"
                  aria-label="Restart building preview"
                  onClick={()=>{clock.current=0;setProgress(0);setPlaying(!reduced);}}
                  title="Restart"
                >
                  <RotateCcw size={13}/>
                </button>
              </div>
            </div>

            <label className="home-build-slider">
              <span className="home-sr-only">Plan to building progress</span>
              <input
                aria-label="Plan to building progress"
                type="range"
                min="0"
                max="100"
                value={Math.round(progress*100)}
                onChange={e=>change(Number(e.target.value)/100)}
                style={{'--build-progress':`${progress*100}%`} as CSSProperties}
              />
            </label>

            <div className="home-stage-buttons">
              {[
                {label:'Floor Plan (2D)',value:0,step:'01'},
                {label:'Parametric Rise (3D)',value:.52,step:'02'},
                {label:'Residence (Full)',value:1,step:'03'}
              ].map(item=>(
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={item.value===0?progress<.22:item.value===.52?progress>=.22&&progress<.75:progress>=.75}
                  onClick={()=>change(item.value)}
                >
                  <span className="home-step-num">{item.step}</span>
                  <span className="home-step-text">{item.label}</span>
                  <ArrowRight size={11} className="home-step-arrow"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footnote">
        <span className="home-foot-tag"><Compass size={12}/> PRECISION CAD · WALKTHROUGH 3D · AI ELEVATIONS</span>
        <p>Interactive Concept Preview · Drag the scrubber or hover rooms to inspect details.</p>
        <span>ARCHITECTURAL INTELLIGENCE <span className="home-foot-dot">✳</span></span>
      </footer>
    </main>
  );
}
