import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { loadDesignFile, useDesignStore } from '../../state/designStore';
import { isRimZone } from '../../state/types';
import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { CATEGORIES, TEMPLATES } from '../../templates/templates';
import { Spinner } from '../ui/Spinner';

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
  // One row per filter, stacked: the wheel scrolls between them.
  const rows = [{ id: 'all', nameKey: 'catAll' as const }, ...CATEGORIES];
  const rowsRef = useRef<HTMLDivElement>(null);
  const loadingId = useUIStore((s) => s.templateLoading);
  const catsRef = useRef<HTMLDivElement>(null);
  const active = rows.findIndex((c) => c.id === category);

  // Jump to the remembered category's row whenever the strip gets shown.
  useLayoutEffect(() => {
    const el = rowsRef.current;
    if (el) el.scrollTop = rows.findIndex((c) => c.id === category) * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // One wheel notch = one row, over the rows and over the category dial (native
  // snapping drops a notch shorter than half a row). Needs a non-passive
  // listener to preventDefault.
  useEffect(() => {
    const el = rowsRef.current;
    const cats = catsRef.current;
    if (!el || !cats) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // sideways: native
      e.preventDefault();
      if (e.timeStamp - last < 200) return;
      last = e.timeStamp;
      scrollToRow(Math.round(el.scrollTop / el.clientHeight) + Math.sign(e.deltaY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    cats.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      cats.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Hovering near the strip's left/right edge scrolls the row under the mouse
  // that way, faster the closer to the edge. A press stops it until the mouse
  // has left the edge zone, so the tile there holds still for the click (and
  // the centring that follows isn't scrolled away again).
  useEffect(() => {
    const el = rowsRef.current;
    if (!el) return;
    const ZONE = 56; // px from the edge
    const MAX_SPEED = 420; // px/s at the very edge
    let row: HTMLElement | null = null;
    let speed = 0; // px/s, signed
    let held = false;
    let frame = 0;
    let lastT = 0;
    const step = (now: number) => {
      frame = 0;
      if (!row || !speed) return;
      row.scrollLeft += (speed * Math.min(now - lastT, 50)) / 1000;
      lastT = now;
      frame = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const left = e.clientX - r.left;
      const right = r.right - e.clientX;
      const near = Math.min(left, right);
      if (near >= ZONE) {
        speed = 0;
        held = false;
        return;
      }
      if (held) return;
      row = el.children[Math.round(el.scrollTop / el.clientHeight)] as HTMLElement;
      speed = (left < right ? -1 : 1) * MAX_SPEED * (1 - Math.max(near, 0) / ZONE);
      if (!frame) {
        lastT = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    const onDown = () => {
      held = true;
      speed = 0;
    };
    const onLeave = () => {
      speed = 0;
      held = false;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  function scrollToRow(index: number) {
    const el = rowsRef.current;
    if (el) el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' });
  }

  function onRowsScroll() {
    const el = rowsRef.current;
    if (!el || !el.clientHeight) return;
    const row = rows[Math.round(el.scrollTop / el.clientHeight)];
    if (row && row.id !== category) setCategory(row.id);
  }

  async function choose(tpl: (typeof TEMPLATES)[number], tile: HTMLElement) {
    tile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const ui = useUIStore.getState();
    ui.setTemplateLoading(tpl.id);
    try {
      const design = await tpl.load();
      if (wheelMode) useDesignStore.getState().loadRims(design);
      else loadDesignFile(design);
      // Keep the spinner up until the new paint has had a moment to draw.
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      ui.setTemplateLoading(null);
    }
  }

  return (
    <div
      data-overlay="bottom"
      role="region"
      aria-label={t('templates')}
      className={`glass template-strip ${floating ? 'template-strip-floating' : ''} ${open ? '' : 'hidden'}`}
    >
      {/* Category dial: the chips stacked on a drum, the active one in the middle. */}
      <div className="template-cats" ref={catsRef} role="radiogroup" aria-label={t('templates')}>
        <div className="template-dial" style={{ '--active': active } as CSSProperties}>
          {rows.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              className={`m3-chip ${category === c.id ? 'm3-chip-active' : ''}`}
              style={{ '--s': i - active } as CSSProperties}
              onClick={() => scrollToRow(i)}
            >
              {t(c.nameKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="template-rows" ref={rowsRef} onScroll={onRowsScroll}>
        {rows.map((c) => (
          <div className="template-row" key={c.id}>
            {(c.id === 'all' ? TEMPLATES : TEMPLATES.filter((tpl) => tpl.category === c.id)).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="template-tile"
                title={t(wheelMode ? 'templatesWheelHint' : 'templatesHint')}
                onClick={(e) => choose(tpl, e.currentTarget)}
              >
                <img src={wheelMode ? tpl.wheelThumb : tpl.thumb} alt="" width={320} height={240} />
                {loadingId === tpl.id && (
                  <span className="template-tile-loading">
                    <Spinner size={22} />
                  </span>
                )}
                {t(tpl.nameKey)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
