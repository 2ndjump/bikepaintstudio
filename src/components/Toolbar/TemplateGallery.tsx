import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadDesignFile } from '../../state/designStore';
import { useT } from '../../i18n/useT';
import { TEMPLATES } from '../../templates/templates';

/**
 * Toolbar button opening a floating gallery of the bundled templates. Picking
 * one loads it exactly like "Load" does (replaces the design; Ctrl+Z undoes).
 */
export function TemplateGallery() {
  const t = useT();
  // Right/top anchor of the open gallery (viewport px), null while closed.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  function toggle() {
    const r = button.current?.getBoundingClientRect();
    setPos(pos || !r ? null : { top: r.bottom + 12, right: Math.max(12, window.innerWidth - r.right) });
  }

  async function choose(tpl: (typeof TEMPLATES)[number]) {
    setPos(null);
    loadDesignFile(await tpl.load());
  }

  return (
    <>
      <button
        ref={button}
        className="m3-btn m3-btn-tonal m3-btn-sm"
        aria-expanded={pos !== null}
        onClick={toggle}
      >
        {t('templates')}
      </button>
      {pos &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={t('templates')}
            className="glass template-gallery"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="flex items-baseline justify-between gap-3 mb-2.5">
              <div className="m3-section-title">{t('templates')}</div>
              <div className="m3-label">{t('templatesHint')}</div>
            </div>
            <div className="template-grid">
              {TEMPLATES.map((tpl) => (
                <button key={tpl.id} type="button" className="template-tile" onClick={() => choose(tpl)}>
                  <img src={tpl.thumb} alt="" width={320} height={240} />
                  {t(tpl.nameKey)}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
