import { useDesignStore } from '../../state/designStore';
import { useT } from '../../i18n/useT';
import { FinishPicker } from './FinishPicker';

export function RimPanel() {
  const rim = useDesignStore((s) => s.rim);
  const setRim = useDesignStore((s) => s.setRim);
  const activeZone = useDesignStore((s) => s.activeZone);
  const t = useT();

  return (
    <div className="space-y-3">
      {/* Finish + colour for this rim (independent of the frame). */}
      <FinishPicker zone={activeZone} />

      <div className="space-y-2.5 pt-1 border-t border-[var(--md-outline-variant)]">
      <div className="m3-section-title">{t('rimGeometry')}</div>
      <label className="m3-label flex flex-col gap-1">
        {t('depth')} {rim.depth}mm
        <input
          type="range"
          min={18}
          max={95}
          step={1}
          value={rim.depth}
          onChange={(e) => setRim({ depth: parseFloat(e.target.value) })}
        />
      </label>
      <label className="m3-label flex flex-col gap-1">
        {t('width')} {rim.width}mm
        <input
          type="range"
          min={15}
          max={40}
          step={1}
          value={rim.width}
          onChange={(e) => setRim({ width: parseFloat(e.target.value) })}
        />
      </label>
      <label className="m3-label flex flex-col gap-1">
        {t('spokes')} {rim.spokeCount}
        <input
          type="range"
          min={16}
          max={36}
          step={2}
          value={rim.spokeCount}
          onChange={(e) => setRim({ spokeCount: parseInt(e.target.value) })}
        />
      </label>
      </div>
    </div>
  );
}
