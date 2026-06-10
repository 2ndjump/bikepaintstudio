import { useUIStore } from '../state/uiStore';
import { translate, type I18nKey } from './strings';

export function useT(): (key: I18nKey) => string {
  const lang = useUIStore((s) => s.lang);
  return (key) => translate(key, lang);
}
