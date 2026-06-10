'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getTileById } from '@/lib/tilesData';

export default function Overlay() {
  const phase = useStore((s) => s.phase);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const closeTile = useStore((s) => s.closeTile);

  useEffect(() => {
    if (phase !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, closeTile]);

  if (phase === 'idle' || !selectedTileId) return null;
  const tile = getTileById(selectedTileId);
  if (!tile) return null;

  return (
    <div className={`overlay ${phase === 'open' ? 'overlay--visible' : ''}`}>
      <div className="overlay__panel">
        <div className="overlay__titlebar">
          <span>
            {tile.name}
            <span className="sep">┊</span>
            {tile.role}
          </span>
          <button onClick={closeTile} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overlay__media">
          {/* placeholder media — swap for video/real imagery later */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tile.img} alt={tile.name} />
          <div className="overlay__tint" />
          <div className="overlay__lift" />
        </div>
      </div>
    </div>
  );
}
