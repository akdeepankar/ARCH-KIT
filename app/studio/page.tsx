"use client";
import {useEffect,useState} from 'react';
import App from '../../src/main';
export default function Page(){const[ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);return ready?<App/>:<div style={{padding:24,fontFamily:'sans-serif',color:'#666'}}>Opening ArchKit…</div>}
