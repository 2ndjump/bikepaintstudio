import { useDesignStore } from '../../state/designStore';
import { ZONE_LABELS, ZONES_PARAMETRIC } from '../../state/types';
import { useT } from '../../i18n/useT';

export function ZoneSelector() {
  const activeZone = useDesignStore((s) => s.activeZone);
  const setActiveZone = useDesignStore((s) => s.setActiveZone);
  const zones = useDesignStore((s) => s.zones);
  const t = useT();

  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
        {t('zones')}
      </div>
      {ZONES_PARAMETRIC.map((z) => {
        const active = z === activeZone;
        const base = zones[z].layers.find((l) => l.type === 'solid');
        const color = base && base.type === 'solid' ? base.color : '#888';
        return (
          <button
            key={z}
            onClick={() => setActiveZone(z)}
            className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left transition ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            <span
              className="h-4 w-4 rounded border border-neutral-600 shrink-0"
              style={{ background: color }}
            />
            {ZONE_LABELS[z]}
          </button>
        );
      })}
    </div>
  );
}
