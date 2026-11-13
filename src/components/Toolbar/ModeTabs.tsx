import { useEffect, useRef } from 'react';
import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { isRimZone, type ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';

/**
 * Frame / Wheels switch. The mode is simply whether the active zone is a rim,
 * so undo/redo and every zone selection keep it consistent; switching returns
 * to the zone last edited in that mode.
 */
export function ModeTabs() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
  const t = useT();
  const last = useRef<{ frame: ZoneId; wheels: ZoneId }>({ frame: 'topTube', wheels: 'frontRim' });
  const wheels = isRimZone(activeZone);

  useEffect(() => {
    last.current[isRimZone(activeZone) ? 'wheels' : 'frame'] = activeZone;
  }, [activeZone]);

  function go(mode: 'frame' | 'wheels') {
    if ((mode === 'wheels') === wheels) return;
    useUIStore.getState().setActiveDividerId(null);
    setActiveZone(last.current[mode]);
  }

  return (
    <div className="m3-segmented" role="tablist">
      <button role="tab" aria-selected={!wheels} className={`m3-seg ${!wheels ? 'm3-seg-active' : ''}`} onClick={() => go('frame')}>
        {t('modeFrame')}
      </button>
      <button role="tab" aria-selected={wheels} className={`m3-seg ${wheels ? 'm3-seg-active' : ''}`} onClick={() => go('wheels')}>
        {t('modeWheels')}
      </button>
    </div>
  );
}
