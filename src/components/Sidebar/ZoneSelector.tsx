import { useDesignStore } from '../../state/designStore';
import { ZONE_LABELS, ZONES_PARAMETRIC } from '../../state/types';
import { useT } from '../../i18n/useT';
import { ColorPicker } from '../ui/ColorPicker';

interface Props {
  /** Number of zone buttons per row (1 for the narrow left rail, 2 in the
   *  wider right panel / mobile). */
  columns?: 1 | 2;
}

export function ZoneSelector({ columns = 1 }: Props) {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
  const setBaseColor = useDesignStore((s) => s.setBaseColor);
  const zones = useDesignStore((s) => s.zones);
  const t = useT();

  return (
    <div className="space-y-2">
      <div className="m3-section-title">{t('zones')}</div>
      <div className={columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'}>
        {ZONES_PARAMETRIC.map((z) => {
          const active = z === activeZone;
          const color = zones[z]?.baseColor ?? '#888888';
          const compact = columns === 2;
          return (
            <div
              key={z}
              className={`m3-chip w-full flex items-center gap-2 ${
                compact ? 'px-2 text-xs' : ''
              } ${active ? 'm3-chip-active' : ''}`}
            >
              {/* Colour indicator that opens a picker for this zone's base
                  colour (frame zones share one global colour, rims are own). */}
              <ColorPicker
                value={color}
                swatchOnly
                swatchClassName="h-6 w-6"
                onChange={(c) => setBaseColor(z, c)}
              />
              <button
                onClick={() => setActiveZone(z)}
                className="flex-1 min-w-0 text-left truncate bg-transparent"
              >
                {ZONE_LABELS[z]}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
