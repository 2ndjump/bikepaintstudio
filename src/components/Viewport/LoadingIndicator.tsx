import { useUIStore } from '../../state/uiStore';
import { useT } from '../../i18n/useT';
import { Spinner } from '../ui/Spinner';

/**
 * Spinner pill at the top of the viewport while something is not visible yet:
 * a template or bike model is loading, or the path tracer is warming up
 * (shader compile, before its first sample).
 */
export function LoadingIndicator() {
  const t = useT();
  const busy = useUIStore(
    (s) => s.modelLoading || s.templateLoading !== null || (s.pathTrace && s.pathTraceSamples === 0),
  );
  if (!busy) return null;
  return (
    <div className="viewport-status" role="status" aria-label={t('loading')}>
      <div className="glass viewport-status-pill">
        <Spinner size={18} />
      </div>
    </div>
  );
}
