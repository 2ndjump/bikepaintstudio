import { useDesignStore } from '../../state/designStore';
import { useT } from '../../i18n/useT';
import { Slider } from '../ui/Slider';

export function RimPanel() {
  const rim = useDesignStore((s) => s.rim);
  const setRim = useDesignStore((s) => s.setRim);
  const t = useT();

  return (
    <div className="space-y-2.5">
      <div>
        <div className="m3-section-title">{t('rimGeometry')}</div>
        <div className="m3-label">{t('rimGeometryBoth')}</div>
      </div>
      <Slider
        label={t('depth')}
        unit="mm"
        min={18}
        max={95}
        step={1}
        value={rim.depth}
        onChange={(v) => setRim({ depth: v })}
      />
      <Slider
        label={t('width')}
        unit="mm"
        min={15}
        max={40}
        step={1}
        value={rim.width}
        onChange={(v) => setRim({ width: v })}
      />
      <Slider
        label={t('spokes')}
        min={16}
        max={36}
        step={2}
        value={rim.spokeCount}
        onChange={(v) => setRim({ spokeCount: Math.round(v / 2) * 2 })}
      />
    </div>
  );
}
