'use client';

import dynamic from 'next/dynamic';
import BackgroundVideo from './ui/BackgroundVideo';
import Overlay from './ui/Overlay';
import SoundToggle from './ui/SoundToggle';

// the WebGL experience is client-only; ssr:false must live in a client component
const Experience = dynamic(() => import('./Experience'), { ssr: false });

export default function Home() {
  return (
    <main className="stage">
      <Experience />
      <Overlay />
      <SoundToggle />
      <BackgroundVideo />
    </main>
  );
}
