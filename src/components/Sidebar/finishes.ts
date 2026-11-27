import type { FinishType } from '../../state/types';
import type { I18nKey } from '../../i18n/strings';

/** The paint finishes with their labels (part finish and layer finish pickers). */
export const FINISHES: { value: FinishType; labelKey: I18nKey }[] = [
  { value: 'matte', labelKey: 'finishMatte' },
  { value: 'satin', labelKey: 'finishSatin' },
  { value: 'glossy', labelKey: 'finishGlossy' },
  { value: 'metallic', labelKey: 'finishMetallic' },
  { value: 'chameleon', labelKey: 'finishChameleon' },
];
