import { loadDesignFile, useDesignStore } from '../../state/designStore';
import { isRimZone } from '../../state/types';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { CATEGORIES, TEMPLATES } from '../../templates/templates';

/** Toolbar button showing/hiding the template strip. */
export function TemplateGalleryToggle() {
  const t = useT();
  const open = useUIStore((s) => s.galleryOpen);
  const setOpen = useUIStore((s) => s.setGalleryOpen);
  return (
    <button
      className={`m3-btn m3-btn-sm ${open ? 'm3-btn-filled' : 'm3-btn-tonal'}`}
      aria-pressed={open}
      onClick={() => setOpen(!open)}
    >
      {t('templates')}
    </button>
  );
}

/**
 * Strip of the bundled templates along the bottom edge (desktop: floating
 * between the side panels; phones: in the page flow). Picking one loads it
 * exactly like "Load" does (replaces the design; Ctrl+Z undoes); in the wheel
 * designer it shows and applies only the templates' wheels. Stays mounted
 * while hidden so the viewport's ViewFit keeps observing it.
 */
export function TemplateGallery({ floating = false }: { floating?: boolean }) {
  const t = useT();
  const open = useUIStore((s) => s.galleryOpen);
  // Wheel designer: show the templates' wheels and take only their rims.
  const wheelMode = useDesignStore((s) => isRimZone(s.activeZone));
  const stored = useUIStore((s) => s.galleryCategory);
  const setCategory = useUIStore((s) => s.setGalleryCategory);
  const category = CATEGORIES.some((c) => c.id === stored) ? stored : 'all';
  const shown = category === 'all' ? TEMPLATES : TEMPLATES.filter((tpl) => tpl.category === category);

  async function choose(tpl: (typeof TEMPLATES)[number]) {
    const design = await tpl.load();
    if (wheelMode) useDesignStore.getState().loadRims(design);
    else loadDesignFile(design);
  }

  return (
    <div
      data-overlay="bottom"
      role="region"
      aria-label={t('templates')}
      className={`glass template-strip ${floating ? 'template-strip-floating' : ''} ${open ? '' : 'hidden'}`}
    >
      <div className="template-cats" role="radiogroup" aria-label={t('templates')}>
        {[{ id: 'all', nameKey: 'catAll' as const }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.id}
            className={`m3-chip ${category === c.id ? 'm3-chip-active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {t(c.nameKey)}
          </button>
        ))}
      </div>
      <div className="template-row" key={category}>
        {shown.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="template-tile"
            title={t(wheelMode ? 'templatesWheelHint' : 'templatesHint')}
            onClick={() => choose(tpl)}
          >
            <img src={wheelMode ? tpl.wheelThumb : tpl.thumb} alt="" width={320} height={240} />
            {t(tpl.nameKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
