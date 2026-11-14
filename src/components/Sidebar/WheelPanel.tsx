import { useDesignStore } from '../../state/designStore';
import { isRimZone, type Layer, type RimZone, type ZoneState } from '../../state/types';
import { useT } from '../../i18n/useT';

/** A rim's paint without the (random) layer ids, to compare the two wheels. */
function paintKey(z: ZoneState): string {
  const layers = z.layers.map((l: Layer) => ({ ...l, id: '' }));
  return JSON.stringify([z.finish, z.baseColor, z.chameleonColors, layers]);
}

/**
 * Wheel designer header: which wheel is being edited and a one-click copy of
 * this wheel's paint to the other (disabled while both already match).
 */
export function WheelPanel() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
  const copyRimDesign = useDesignStore((s) => s.copyRimDesign);
  const same = useDesignStore((s) => paintKey(s.zones.frontRim) === paintKey(s.zones.rearRim));
  const t = useT();

  const zone: RimZone = isRimZone(activeZone) ? activeZone : 'frontRim';
  const other: RimZone = zone === 'frontRim' ? 'rearRim' : 'frontRim';

  return (
    <div className="space-y-2.5">
      <div className="m3-section-title">{t('wheel')}</div>
      <div className="m3-segmented w-full" role="group">
        {(['frontRim', 'rearRim'] as const).map((z) => (
          <button
            key={z}
            onClick={() => setActiveZone(z)}
            aria-pressed={zone === z}
            className={`m3-seg flex-1 ${zone === z ? 'm3-seg-active' : ''}`}
          >
            {t(z === 'frontRim' ? 'wheelFront' : 'wheelRear')}
          </button>
        ))}
      </div>
      {/* Disabled while both wheels already match. */}
      <button
        type="button"
        className="m3-btn m3-btn-tonal m3-btn-sm w-full"
        disabled={same}
        onClick={() => copyRimDesign(zone, other)}
      >
        {t(other === 'rearRim' ? 'copyToRear' : 'copyToFront')}
      </button>
    </div>
  );
}
