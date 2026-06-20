import { useDesignStore } from '../../state/designStore';
import { ZONE_LABELS, ZONES_PARAMETRIC } from '../../state/types';
import { useT } from '../../i18n/useT';

interface Props {
  /** Number of zone buttons per row (1 for the narrow left rail, 2 in the
   *  wider right panel / mobile). */
  columns?: 1 | 2;
}

export function ZoneSelector({ columns = 1 }: Props) {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
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
            <button
              key={z}
              onClick={() => setActiveZone(z)}
              className={`m3-chip w-full text-left relative overflow-hidden ${
                compact ? 'px-2.5 text-xs' : ''
              } ${active ? 'm3-chip-active' : ''}`}
            >
              {/* Frame colour shown as a triangle in the top-left corner */}
              <span
                className="absolute top-0 left-0"
                style={{
                  width: compact ? 14 : 16,
                  height: compact ? 14 : 16,
                  background: color,
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                }}
              />
              <span className="truncate min-w-0">{ZONE_LABELS[z]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
