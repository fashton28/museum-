'use client';

import { useEffect, useRef } from 'react';

const VIDEO_ID = 'FdOfhuYW_OI';
const START_S = 1800; // ~minute 30

/**
 * Ambient background soundtrack: a hidden YouTube iframe autoplaying from
 * START_S. Browsers only allow MUTED autoplay, so it starts muted and unmutes
 * itself (postMessage to the player API) on the first user gesture.
 */
export default function BackgroundVideo() {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const send = (func: string) =>
      ref.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        'https://www.youtube.com',
      );
    const unmute = () => {
      send('unMute');
      send('playVideo');
      window.removeEventListener('pointerdown', unmute);
      window.removeEventListener('wheel', unmute);
      window.removeEventListener('keydown', unmute);
    };
    window.addEventListener('pointerdown', unmute);
    window.addEventListener('wheel', unmute);
    window.addEventListener('keydown', unmute);
    return () => {
      window.removeEventListener('pointerdown', unmute);
      window.removeEventListener('wheel', unmute);
      window.removeEventListener('keydown', unmute);
    };
  }, []);

  return (
    <iframe
      ref={ref}
      className="bg-video"
      src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&start=${START_S}&enablejsapi=1&loop=1&playlist=${VIDEO_ID}&controls=0&disablekb=1&playsinline=1`}
      allow="autoplay; encrypted-media"
      title="Ambient background video"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
