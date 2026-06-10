import { useDesignStore } from '../../state/designStore';
import { useT } from '../../i18n/useT';

export function RimPanel() {
  const rim = useDesignStore((s) => s.rim);
  const setRim = useDesignStore((s) => s.setRim);
  const t = useT();

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-neutral-400">
        {t('rimGeometry')}
      </div>
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
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
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
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
      <label className="text-xs text-neutral-400 flex flex-col gap-1">
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
  );
}
