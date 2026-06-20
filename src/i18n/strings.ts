import type { Lang } from '../state/uiStore';

export type I18nKey =
  | 'active'
  | 'save'
  | 'load'
  | 'pngExport'
  | 'zones'
  | 'paintFinish'
  | 'baseColor'
  | 'finishMatte'
  | 'finishSatin'
  | 'finishGlossy'
  | 'finishMetallic'
  | 'finishChameleon'
  | 'layers'
  | 'addColor'
  | 'addPattern'
  | 'addImage'
  | 'addText'
  | 'tooltipVisibility'
  | 'tooltipMoveUp'
  | 'tooltipMoveDown'
  | 'tooltipDelete'
  | 'blend'
  | 'opacity'
  | 'rimGeometry'
  | 'depth'
  | 'width'
  | 'spokes'
  | 'patternHexagons'
  | 'patternStripes'
  | 'patternCarbon'
  | 'color'
  | 'background'
  | 'scale'
  | 'rotation'
  | 'rotationX'
  | 'rotationY'
  | 'rotationShort'
  | 'intensity'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'text'
  | 'outline'
  | 'size'
  | 'outlineWidth'
  | 'letterRotation'
  | 'bgDark'
  | 'bgLight'
  | 'bgStudio'
  | 'backgroundLabel'
  | 'undo'
  | 'redo'
  | 'hueShift'
  | 'dodge'
  | 'burn'
  | 'levelsShadows'
  | 'levelsMidtones'
  | 'levelsHighlights'
  | 'levels'
  | 'addDistortion'
  | 'distortionKind'
  | 'distortionGaussian'
  | 'distortionDirectional'
  | 'distortionMotion'
  | 'effectNone'
  | 'amount'
  | 'angle'
  | 'patternSmoke'
  | 'patternThread'
  | 'patternSplashes'
  | 'patternSource'
  | 'patternProcedural'
  | 'patternTexture'
  | 'uploadFont'
  | 'systemFonts'
  | 'requestSystemFonts'
  | 'chameleonColorA'
  | 'chameleonColorB'
  | 'chameleonColorC';

const STRINGS: Record<I18nKey, Record<Lang, string>> = {
  active: { de: 'Aktiv', en: 'Active' },
  save: { de: 'Speichern', en: 'Save' },
  load: { de: 'Laden', en: 'Load' },
  pngExport: { de: 'PNG Export', en: 'Export PNG' },
  zones: { de: 'Zonen', en: 'Zones' },
  paintFinish: { de: 'Lack-Finish', en: 'Paint Finish' },
  baseColor: { de: 'Grundfarbe', en: 'Base Color' },
  finishMatte: { de: 'Matt', en: 'Matte' },
  finishSatin: { de: 'Seidenmatt', en: 'Satin' },
  finishGlossy: { de: 'Glanz', en: 'Glossy' },
  finishMetallic: { de: 'Metallic', en: 'Metallic' },
  finishChameleon: { de: 'Chamäleon', en: 'Chameleon' },
  layers: { de: 'Layer-Stack', en: 'Layers' },
  addColor: { de: '+ Farbe', en: '+ Color' },
  addPattern: { de: '+ Muster', en: '+ Pattern' },
  addImage: { de: '+ Bild', en: '+ Image' },
  addText: { de: '+ Text', en: '+ Text' },
  tooltipVisibility: { de: 'Sichtbarkeit', en: 'Visibility' },
  tooltipMoveUp: { de: 'Nach oben', en: 'Move up' },
  tooltipMoveDown: { de: 'Nach unten', en: 'Move down' },
  tooltipDelete: { de: 'Löschen', en: 'Delete' },
  blend: { de: 'Blend', en: 'Blend' },
  opacity: { de: 'Opacity', en: 'Opacity' },
  rimGeometry: { de: 'Felgen-Geometrie', en: 'Rim Geometry' },
  depth: { de: 'Tiefe', en: 'Depth' },
  width: { de: 'Breite', en: 'Width' },
  spokes: { de: 'Speichen', en: 'Spokes' },
  patternHexagons: { de: 'Hexagons', en: 'Hexagons' },
  patternStripes: { de: 'Streifen', en: 'Stripes' },
  patternCarbon: { de: 'Carbon', en: 'Carbon' },
  color: { de: 'Farbe', en: 'Color' },
  background: { de: 'Hintergrund', en: 'Background' },
  scale: { de: 'Scale', en: 'Scale' },
  rotation: { de: 'Rotation', en: 'Rotation' },
  rotationX: { de: 'Rotation X', en: 'Rotation X' },
  rotationY: { de: 'Rotation Y', en: 'Rotation Y' },
  rotationShort: { de: 'Rot', en: 'Rot' },
  intensity: { de: 'Intensität', en: 'Intensity' },
  brightness: { de: 'Helligkeit', en: 'Brightness' },
  contrast: { de: 'Kontrast', en: 'Contrast' },
  saturation: { de: 'Sättig.', en: 'Sat.' },
  text: { de: 'Text', en: 'Text' },
  outline: { de: 'Outline', en: 'Outline' },
  size: { de: 'Größe', en: 'Size' },
  outlineWidth: { de: 'Outline Breite', en: 'Outline Width' },
  letterRotation: { de: 'Buchstaben-Rotation', en: 'Letter rotation' },
  bgDark: { de: 'Dunkel', en: 'Dark' },
  bgLight: { de: 'Hell', en: 'Light' },
  bgStudio: { de: 'Studio', en: 'Studio' },
  backgroundLabel: { de: 'Hintergrund', en: 'Background' },
  undo: { de: 'Rückgängig', en: 'Undo' },
  redo: { de: 'Wiederh.', en: 'Redo' },
  hueShift: { de: 'Farbton', en: 'Hue' },
  dodge: { de: 'Dodge', en: 'Dodge' },
  burn: { de: 'Burn', en: 'Burn' },
  levelsShadows: { de: 'Schatten', en: 'Shadows' },
  levelsMidtones: { de: 'Mitten', en: 'Midtones' },
  levelsHighlights: { de: 'Lichter', en: 'Highlights' },
  levels: { de: 'Tonwerte', en: 'Levels' },
  addDistortion: { de: '+ Effekt', en: '+ Effect' },
  distortionKind: { de: 'Effekt', en: 'Effect' },
  distortionGaussian: { de: 'Weichzeichnen', en: 'Gaussian Blur' },
  distortionDirectional: { de: 'Richtungs-Blur', en: 'Directional Blur' },
  distortionMotion: { de: 'Bewegungs-Blur', en: 'Motion Blur' },
  effectNone: { de: 'Kein', en: 'None' },
  amount: { de: 'Stärke', en: 'Amount' },
  angle: { de: 'Winkel', en: 'Angle' },
  patternSmoke: { de: 'Rauch', en: 'Smoke' },
  patternThread: { de: 'Fäden', en: 'Thread' },
  patternSplashes: { de: 'Splashes', en: 'Splashes' },
  patternSource: { de: 'Quelle', en: 'Source' },
  patternProcedural: { de: 'Procedural', en: 'Procedural' },
  patternTexture: { de: 'Textur', en: 'Texture' },
  uploadFont: { de: 'Font laden', en: 'Upload Font' },
  systemFonts: { de: 'System', en: 'System' },
  requestSystemFonts: { de: 'System-Fonts', en: 'System Fonts' },
  chameleonColorA: { de: 'Farbe A', en: 'Color A' },
  chameleonColorB: { de: 'Farbe B', en: 'Color B' },
  chameleonColorC: { de: 'Farbe C', en: 'Color C' },
};

export function translate(key: I18nKey, lang: Lang): string {
  return STRINGS[key][lang];
}
