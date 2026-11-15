import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { Slider } from '../ui/Slider';

/** Anchor riding speeds (km/h): walking pace up to a fast road-bike sprint.
 *  1 km/h (the default) still leaves rim decals readable. */
const KMH_MARKS = [1, 5, 15, 25, 35, 45];

/** Pause/play and speed for the wheel designer's spinning preview, under the wheel. */
export function WheelSpinControls() {
  const spin = useUIStore((s) => s.wheelSpin);
  const setSpin = useUIStore((s) => s.setWheelSpin);
  const kmh = useUIStore((s) => s.wheelKmh);
  const setKmh = useUIStore((s) => s.setWheelKmh);
  const t = useT();

  return (
    <div className="viewport-dock">
      <div className="glass flex items-center gap-4 pl-1.5 pr-5 py-1.5" title={t('dragToTurn')}>
        <button
          type="button"
          onClick={() => setSpin(!spin)}
          className="m3-btn m3-btn-filled m3-btn-sm"
          aria-pressed={!spin}
        >
          {spin ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <rect x="2" y="1.5" width="3" height="9" rx="0.8" />
              <rect x="7" y="1.5" width="3" height="9" rx="0.8" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          )}
          {t(spin ? 'spinPause' : 'spinPlay')}
        </button>
        <div className="w-60">
          <Slider
            label={t('spinSpeed')}
            unit="km/h"
            min={0}
            max={60}
            step={0.1}
            curve={2} // most of the useful inspection range is below 5 km/h
            marks={KMH_MARKS}
            value={kmh}
            onChange={setKmh}
          />
        </div>
      </div>
    </div>
  );
}
