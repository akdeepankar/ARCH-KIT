import type {ReactNode} from 'react';
export const metadata={title:'ArchKit — Residential Studio',description:'Draw your floor plan, explore in 3D, and plan with Muse Spark.'};
export default function Layout({children}:{children:ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;450;500;550;600;650;700&display=swap" rel="stylesheet"/></head><body><div id="root">{children}</div></body></html>}
