'use client';

import { useStore } from '@/lib/store';
import { setSound } from '@/lib/audioEngine';

export default function SoundToggle() {
  const soundOn = useStore((s) => s.soundOn);

  const toggle = () => {
    const next = !useStore.getState().soundOn;
    useStore.setState({ soundOn: next });
    void setSound(next); // engine is created lazily inside, on this user gesture
  };

  return (
    <button className="sound" onClick={toggle} aria-label={soundOn ? 'Mute sound' : 'Enable sound'}>
      {soundOn ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" fill="currentColor" stroke="none" />
          <path d="M16 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" fill="currentColor" stroke="none" />
          <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
        </svg>
      )}
    </button>
  );
}
