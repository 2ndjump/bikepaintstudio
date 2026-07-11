import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { ZONE_LABELS, ZONES_PARAMETRIC, type ZoneId } from '../../state/types';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';

interface Props {
  /** Number of zone buttons per row (1 for the narrow left rail, 2 in the
   *  wider right panel / mobile). */
  columns?: 1 | 2;
}

const RIM_ZONES: ZoneId[] = ['frontRim', 'rearRim'];
const isRimZone = (z: ZoneId) => RIM_ZONES.includes(z);

export function ZoneSelector({ columns = 1 }: Props) {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
  const setZoneBaseColor = useDesignStore((s) => s.setZoneBaseColor);
  const zones = useDesignStore((s) => s.zones);
  const setActiveDividerId = useUIStore((s) => s.setActiveDividerId);
  const t = useT();

  // Selecting a zone drops any divider being edited (so its handles disappear).
  const selectZone = (z: ZoneId) => {
    setActiveZone(z);
    setActiveDividerId(null);
  };

  const gridClass = columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'space-y-1';
  const compact = columns === 2;

  const frameZones = ZONES_PARAMETRIC.filter((z) => !isRimZone(z));
  const rimZones = ZONES_PARAMETRIC.filter(isRimZone);

  const renderZone = (z: ZoneId) => {
    const active = z === activeZone;
    const color = zones[z]?.baseColor ?? '#888888';
    const hasLayers = (zones[z]?.layers?.length ?? 0) > 0;
    return (
      <div
        key={z}
        className={`m3-chip w-full flex items-center gap-2 ${compact ? 'px-2 text-xs' : ''} ${
          active ? 'm3-chip-active' : ''
        }`}
      >
        {/* Colour indicator that opens a picker for this zone's base colour
            (frame zones share one global colour, rims are own). */}
        <ColorPicker
          value={color}
          swatchOnly
          swatchClassName="h-6 w-6"
          onChange={(c) => setZoneBaseColor(z, c)}
        />
        <button
          onClick={() => selectZone(z)}
          className="flex-1 min-w-0 text-left truncate bg-transparent"
        >
          {ZONE_LABELS[z]}
        </button>
        {/* Dot marking zones that carry one or more layers. */}
        {hasLayers && (
          <span
            className="flex-none rounded-full"
            style={{ width: 7, height: 7, background: 'var(--md-primary)' }}
            title={t('hasLayers')}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="m3-section-title">{t('zones')}</div>
      <div className={gridClass}>{frameZones.map(renderZone)}</div>

      {/* Wheel zones are visually separated from the frame zones — they carry
          their own paint/finish (not the shared global frame colour). */}
      {rimZones.length > 0 && (
        <div
          className="space-y-2 pt-2 mt-1"
          style={{ borderTop: '1px solid var(--md-outline-variant)' }}
        >
          <div className="m3-section-title">{t('rims')}</div>
          <div className={gridClass}>{rimZones.map(renderZone)}</div>
        </div>
      )}
    </div>
  );
}
