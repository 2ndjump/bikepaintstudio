import type { Lang } from '../state/uiStore';

export type I18nKey =
  | 'active'
  | 'save'
  | 'load'
  | 'pngExport'
  | 'zones'
  | 'rims'
  | 'hasLayers'
  | 'palette'
  | 'removeColor'
  | 'paletteEmpty'
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
  | 'addShape'
  | 'shapeRectangle'
  | 'shapeTriangle'
  | 'shapeCircle'
  | 'height'
  | 'tooltipVisibility'
  | 'tooltipExpand'
  | 'tooltipCollapse'
  | 'tooltipMoveUp'
  | 'tooltipMoveDown'
  | 'tooltipDelete'
  | 'layerShow'
  | 'layerHide'
  | 'layerDuplicate'
  | 'layerOptions'
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
  | 'scaleX'
  | 'scaleY'
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
  | 'patternTopo'
  | 'patternMarble'
  | 'patternVoronoi'
  | 'patternCamo'
  | 'patternDigiCamo'
  | 'patternCircuit'
  | 'patternMesh'
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
  rims: { de: 'Felgen', en: 'Rims' },
  hasLayers: { de: 'Ebenen vorhanden', en: 'Has layers' },
  palette: { de: 'Palette', en: 'Palette' },
  removeColor: { de: 'Entfernen', en: 'Remove' },
  paletteEmpty: { de: 'Noch keine Farben', en: 'No colours yet' },
  paintFinish: { de: 'Lack-Finish', en: 'Paint Finish' },
  baseColor: { de: 'Grundfarbe', en: 'Base Color' },
  finishMatte: { de: 'Matt', en: 'Matte' },
  finishSatin: { de: 'Seidenmatt', en: 'Satin' },
  finishGlossy: { de: 'Glanz', en: 'Glossy' },
  finishMetallic: { de: 'Metallic', en: 'Metallic' },
  finishChameleon: { de: 'Chamäleon', en: 'Chameleon' },
  layers: { de: 'Layers', en: 'Layers' },
  addColor: { de: '+ Farbe', en: '+ Color' },
  addPattern: { de: '+ Muster', en: '+ Pattern' },
  addImage: { de: '+ Bild', en: '+ Image' },
  addText: { de: '+ Text', en: '+ Text' },
  addShape: { de: '+ Form', en: '+ Shape' },
  shapeRectangle: { de: 'Rechteck', en: 'Rectangle' },
  shapeTriangle: { de: 'Dreieck', en: 'Triangle' },
  shapeCircle: { de: 'Kreis', en: 'Circle' },
  height: { de: 'Höhe', en: 'Height' },
  tooltipVisibility: { de: 'Sichtbarkeit', en: 'Visibility' },
  tooltipExpand: { de: 'Aufklappen', en: 'Expand' },
  tooltipCollapse: { de: 'Zuklappen', en: 'Collapse' },
  tooltipMoveUp: { de: 'Nach oben', en: 'Move up' },
  tooltipMoveDown: { de: 'Nach unten', en: 'Move down' },
  tooltipDelete: { de: 'Löschen', en: 'Delete' },
  layerShow: { de: 'Einblenden', en: 'Show' },
  layerHide: { de: 'Ausblenden', en: 'Hide' },
  layerDuplicate: { de: 'Duplizieren', en: 'Duplicate' },
  layerOptions: { de: 'Optionen', en: 'Options' },
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
  scaleX: { de: 'Scale X', en: 'Scale X' },
  scaleY: { de: 'Scale Y', en: 'Scale Y' },
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
  patternTopo: { de: 'Höhenlinien', en: 'Topographic' },
  patternMarble: { de: 'Marmor', en: 'Marble' },
  patternVoronoi: { de: 'Craquelé', en: 'Voronoi' },
  patternCamo: { de: 'Camouflage', en: 'Camo' },
  patternDigiCamo: { de: 'Digital-Camo', en: 'Digital camo' },
  patternCircuit: { de: 'Circuit', en: 'Circuit' },
  patternMesh: { de: 'Gitter', en: 'Mesh' },
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
