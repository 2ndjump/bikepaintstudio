import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';

const SEEN_KEY = 'bps.turnHintSeen';

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Small pill under the bike saying how to turn it. Fades out for good the
 * first time the bike is turned (right mouse button / one finger on the canvas).
 */
export function TurnHint() {
  const [seen, setSeen] = useState(readSeen);
  const t = useT();

  useEffect(() => {
    if (seen) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      if (e.button !== 2 && e.pointerType !== 'touch') return;
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        // Private mode: the hint just comes back next time.
      }
      setSeen(true);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [seen]);

  const touch = window.matchMedia('(pointer: coarse)').matches;

  return (
    <div className="viewport-dock">
      <div className={`turn-hint glass ${seen ? 'turn-hint-seen' : ''}`}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
          <path d="M13.5 2v3h-3" />
        </svg>
        {t(touch ? 'turnHintTouch' : 'turnHintMouse')}
      </div>
    </div>
  );
}
