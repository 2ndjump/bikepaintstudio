import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';

/** Pause/play for the wheel designer's spinning preview, under the wheel. */
export function WheelSpinControls() {
  const spin = useUIStore((s) => s.wheelSpin);
  const setSpin = useUIStore((s) => s.setWheelSpin);
  const t = useT();

  return (
    <div className="viewport-dock">
      <div className="glass flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full">
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
        <span className="m3-label">{t('dragToTurn')}</span>
      </div>
    </div>
  );
}
