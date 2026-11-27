import type { Lang } from '../state/uiStore';

export type I18nKey =
  | 'active'
  | 'save'
  | 'load'
  | 'pngExport'
  | 'zones'
  | 'rims'
  | 'hasLayers'
  | 'dividers'
  | 'addDivider'
  | 'addDividerShape'
  | 'dividerShapeLabel'
  | 'dividersEmpty'
  | 'dividerLabel'
  | 'dividerEdit'
  | 'dividerEditing'
  | 'dividerSoftness'
  | 'dividerPatternNone'
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
  | 'shapeDiamond'
  | 'shapePentagon'
  | 'shapeHexagon'
  | 'shapeStar'
  | 'shapeHeart'
  | 'shapeRing'
  | 'shapeCross'
  | 'shapeArrow'
  | 'shapeLightning'
  | 'shapeChevron'
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
  | 'layerGroup'
  | 'layerFinish'
  | 'finishInherit'
  | 'layerRepeat'
  | 'repeatOnce'
  | 'layerFill'
  | 'layerBelowDivider'
  | 'layerOptions'
  | 'blend'
  | 'opacity'
  | 'rimGeometry'
  | 'depth'
  | 'width'
  | 'spokes'
  | 'pattern'
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
  | 'textBold'
  | 'textItalic'
  | 'textUnderline'
  | 'textStrikethrough'
  | 'outline'
  | 'size'
  | 'outlineWidth'
  | 'letterRotation'
  | 'letterSpacing'
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
  | 'patternForged'
  | 'patternSource'
  | 'patternProcedural'
  | 'patternTexture'
  | 'uploadFont'
  | 'systemFonts'
  | 'requestSystemFonts'
  | 'chameleonColorA'
  | 'chameleonColorB'
  | 'chameleonColorC'
  | 'bikeModel'
  | 'variantGravel'
  | 'variantRoad'
  | 'variantClassic'
  | 'variantAero'
  | 'modeFrame'
  | 'modeWheels'
  | 'wheelFront'
  | 'wheelRear'
  | 'wheel'
  | 'copyToRear'
  | 'copyToFront'
  | 'rimGeometryBoth'
  | 'spinPause'
  | 'spinPlay'
  | 'dragToTurn'
  | 'turnHintMouse'
  | 'loading'
  | 'turnHintTouch'
  | 'spinSpeed'
  | 'handleScale'
  | 'handleStretch'
  | 'handleRotate'
  | 'shape'
  | 'image'
  | 'layerEditHint'
  | 'layerName'
  | 'zoneClickHint'
  | 'templates'
  | 'more'
  | 'templatesHint'
  | 'templatesWheelHint'
  | 'tplDiagonal'
  | 'tplRace'
  | 'tplFade'
  | 'tplStealth'
  | 'tplRetro'
  | 'tplPop'
  | 'tplChameleon'
  | 'tplMinimal'
  | 'catRacy'
  | 'catAggressive'
  | 'catArtistic'
  | 'catHeritage'
  | 'catClean'
  | 'catChameleon'
  | 'catAll'
  | 'tplTeamblock'
  | 'tplTricolore'
  | 'tplNumber'
  | 'tplNeontt'
  | 'tplHazard'
  | 'tplShards'
  | 'tplClaws'
  | 'tplGlitch'
  | 'tplSplatter'
  | 'tplMarble'
  | 'tplBordeaux'
  | 'tplCeleste'
  | 'tplBarber'
  | 'tplAccentline'
  | 'tplPastel'
  | 'tplOilslick'
  | 'tplAurora'
  | 'tplCopperflip'
  | 'tplMidnight';

const STRINGS: Record<I18nKey, Record<Lang, string>> = {
  active: { de: 'Aktiv', en: 'Active' },
  save: { de: 'Speichern', en: 'Save' },
  load: { de: 'Laden', en: 'Load' },
  pngExport: { de: 'PNG Export', en: 'Export PNG' },
  zones: { de: 'Zonen', en: 'Zones' },
  rims: { de: 'Felgen', en: 'Rims' },
  dividers: { de: 'Divider', en: 'Dividers' },
  addDivider: { de: 'Divider hinzufügen', en: 'Add divider' },
  addDividerShape: { de: 'Form hinzufügen', en: 'Add shape' },
  dividerShapeLabel: { de: 'Form', en: 'Shape' },
  dividersEmpty: { de: 'Kein Divider', en: 'No dividers' },
  dividerLabel: { de: 'Divider', en: 'Divider' },
  dividerEdit: { de: 'Linie bearbeiten', en: 'Edit line' },
  dividerEditing: { de: 'Griffe im Bild ziehen', en: 'Drag the handles' },
  dividerSoftness: { de: 'Weichzeichnen', en: 'Feather' },
  dividerPatternNone: { de: 'Kein Muster', en: 'No pattern' },
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
  layers: { de: 'Ebenen', en: 'Layers' },
  addColor: { de: '+ Farbe', en: '+ Color' },
  addPattern: { de: '+ Muster', en: '+ Pattern' },
  addImage: { de: '+ Bild', en: '+ Image' },
  addText: { de: '+ Text', en: '+ Text' },
  addShape: { de: '+ Form', en: '+ Shape' },
  shapeRectangle: { de: 'Rechteck', en: 'Rectangle' },
  shapeTriangle: { de: 'Dreieck', en: 'Triangle' },
  shapeCircle: { de: 'Kreis', en: 'Circle' },
  shapeDiamond: { de: 'Raute', en: 'Diamond' },
  shapePentagon: { de: 'Fünfeck', en: 'Pentagon' },
  shapeHexagon: { de: 'Sechseck', en: 'Hexagon' },
  shapeStar: { de: 'Stern', en: 'Star' },
  shapeHeart: { de: 'Herz', en: 'Heart' },
  shapeRing: { de: 'Ring', en: 'Ring' },
  shapeCross: { de: 'Kreuz', en: 'Cross' },
  shapeArrow: { de: 'Pfeil', en: 'Arrow' },
  shapeLightning: { de: 'Blitz', en: 'Lightning' },
  shapeChevron: { de: 'Chevron', en: 'Chevron' },
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
  layerGroup: { de: 'Mit Ebene darunter gruppieren', en: 'Group with layer below' },
  layerFinish: { de: 'Finish', en: 'Finish' },
  finishInherit: { de: 'Wie Lack', en: 'As paint' },
  layerRepeat: { de: 'Wiederholen', en: 'Repeat' },
  repeatOnce: { de: 'Einmal', en: 'Once' },
  layerFill: { de: 'Muster in der Ebene', en: 'Pattern inside' },
  layerBelowDivider: { de: 'Unter dem Divider', en: 'Below divider' },
  layerOptions: { de: 'Optionen', en: 'Options' },
  blend: { de: 'Mischmodus', en: 'Blend' },
  opacity: { de: 'Deckkraft', en: 'Opacity' },
  rimGeometry: { de: 'Felgen-Geometrie', en: 'Rim Geometry' },
  depth: { de: 'Tiefe', en: 'Depth' },
  width: { de: 'Breite', en: 'Width' },
  spokes: { de: 'Speichen', en: 'Spokes' },
  pattern: { de: 'Muster', en: 'Pattern' },
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
  textBold: { de: 'Fett', en: 'Bold' },
  textItalic: { de: 'Kursiv', en: 'Italic' },
  textUnderline: { de: 'Unterstrichen', en: 'Underline' },
  textStrikethrough: { de: 'Durchgestrichen', en: 'Strikethrough' },
  outline: { de: 'Outline', en: 'Outline' },
  size: { de: 'Größe', en: 'Size' },
  outlineWidth: { de: 'Outline Breite', en: 'Outline Width' },
  letterRotation: { de: 'Buchstaben-Rotation', en: 'Letter rotation' },
  letterSpacing: { de: 'Zeichenabstand', en: 'Letter spacing' },
  backgroundLabel: { de: 'Hintergrund', en: 'Background' },
  undo: { de: 'Rückgängig (Strg+Z)', en: 'Undo (Ctrl+Z)' },
  redo: { de: 'Wiederholen (Strg+Umschalt+Z)', en: 'Redo (Ctrl+Shift+Z)' },
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
  patternForged: { de: 'Forged Carbon', en: 'Forged Carbon' },
  patternSource: { de: 'Quelle', en: 'Source' },
  patternProcedural: { de: 'Procedural', en: 'Procedural' },
  patternTexture: { de: 'Textur', en: 'Texture' },
  uploadFont: { de: 'Font laden', en: 'Upload Font' },
  systemFonts: { de: 'System', en: 'System' },
  requestSystemFonts: { de: 'System-Fonts', en: 'System Fonts' },
  chameleonColorA: { de: 'Farbe A', en: 'Color A' },
  chameleonColorB: { de: 'Farbe B', en: 'Color B' },
  chameleonColorC: { de: 'Farbe C', en: 'Color C' },
  bikeModel: { de: 'Modell', en: 'Model' },
  variantGravel: { de: 'Gravel', en: 'Gravel' },
  variantRoad: { de: 'Rennrad', en: 'Road' },
  variantClassic: { de: 'Klassisch', en: 'Classic' },
  variantAero: { de: 'Aero', en: 'Aero' },
  modeFrame: { de: 'Rahmen', en: 'Frame' },
  modeWheels: { de: 'Laufräder', en: 'Wheels' },
  wheelFront: { de: 'Vorderrad', en: 'Front wheel' },
  wheelRear: { de: 'Hinterrad', en: 'Rear wheel' },
  wheel: { de: 'Laufrad', en: 'Wheel' },
  copyToRear: { de: 'Design aufs Hinterrad kopieren', en: 'Copy design to rear wheel' },
  copyToFront: { de: 'Design aufs Vorderrad kopieren', en: 'Copy design to front wheel' },
  rimGeometryBoth: { de: 'Gilt für beide Laufräder', en: 'Applies to both wheels' },
  spinPause: { de: 'Pause', en: 'Pause' },
  spinPlay: { de: 'Drehen', en: 'Spin' },
  dragToTurn: { de: 'Ziehen zum Drehen', en: 'Drag to turn' },
  loading: { de: 'Lädt …', en: 'Loading …' },
  turnHintMouse: { de: 'Rechte Maustaste ziehen: Rad drehen', en: 'Right-drag to turn the bike' },
  turnHintTouch: { de: 'Wischen: Rad drehen', en: 'Swipe to turn the bike' },
  spinSpeed: { de: 'Tempo', en: 'Speed' },
  handleScale: { de: 'Skalieren', en: 'Scale' },
  handleStretch: { de: 'Strecken', en: 'Stretch' },
  shape: { de: 'Form', en: 'Shape' },
  image: { de: 'Bild', en: 'Image' },
  layerEditHint: { de: 'Auf dem Modell ziehen zum Verschieben, Griffe zum Skalieren und Drehen.', en: 'Drag it on the model to move; use the handles to scale and rotate.' },
  layerName: { de: 'Name', en: 'Name' },
  zoneClickHint: { de: 'Tipp: Klicke ein Rahmenteil im Bild an, um es auszuwählen.', en: 'Tip: click a part of the frame to select it.' },
  handleRotate: { de: 'Drehen (Shift: 15°-Schritte)', en: 'Rotate (Shift: 15° steps)' },
  templates: { de: 'Vorlagen', en: 'Templates' },
  more: { de: 'Mehr', en: 'More' },
  templatesHint: { de: 'Ersetzt das aktuelle Design (Strg+Z macht es rückgängig).', en: 'Replaces the current design (Ctrl+Z undoes it).' },
  templatesWheelHint: { de: 'Übernimmt nur die Laufräder dieser Vorlage (Strg+Z macht es rückgängig).', en: 'Takes only the wheels of this template (Ctrl+Z undoes it).' },
  tplDiagonal: { de: 'Diagonale', en: 'Diagonal Split' },
  tplRace: { de: 'Rennteam', en: 'Race Team' },
  tplFade: { de: 'Sonnenuntergang', en: 'Sunset Fade' },
  tplStealth: { de: 'Stealth', en: 'Stealth' },
  tplRetro: { de: 'Stahl-Klassiker', en: 'Heritage Steel' },
  tplPop: { de: 'Pop-Art', en: 'Pop Art' },
  tplChameleon: { de: 'Chamäleon', en: 'Chameleon' },
  tplMinimal: { de: 'Reinweiß', en: 'Pure White' },
  catRacy: { de: 'Racy', en: 'Racy' },
  catAggressive: { de: 'Aggressiv', en: 'Aggressive' },
  catArtistic: { de: 'Künstlerisch', en: 'Artistic' },
  catHeritage: { de: 'Klassisch', en: 'Heritage' },
  catClean: { de: 'Clean', en: 'Clean' },
  catChameleon: { de: 'Chamäleon', en: 'Chameleon' },
  catAll: { de: 'Alle', en: 'All' },
  tplTeamblock: { de: 'Profiteam', en: 'Pro Team' },
  tplTricolore: { de: 'Trikolore', en: 'Tricolour' },
  tplNumber: { de: 'Startnummer', en: 'Race Number' },
  tplNeontt: { de: 'Neon-Zeitfahren', en: 'Neon Time Trial' },
  tplHazard: { de: 'Warnstreifen', en: 'Hazard' },
  tplShards: { de: 'Scherben', en: 'Shattered' },
  tplClaws: { de: 'Krallen', en: 'Claw Marks' },
  tplGlitch: { de: 'Glitch', en: 'Glitch' },
  tplSplatter: { de: 'Farbspritzer', en: 'Paint Splatter' },
  tplMarble: { de: 'Marmor', en: 'Marble' },
  tplBordeaux: { de: 'Bordeaux', en: 'Bordeaux' },
  tplCeleste: { de: 'Mint & Marine', en: 'Mint & Navy' },
  tplBarber: { de: 'Barber Pole', en: 'Barber Pole' },
  tplAccentline: { de: 'Akzentlinie', en: 'Accent Line' },
  tplPastel: { de: 'Pastell', en: 'Pastel' },
  tplOilslick: { de: 'Ölfilm', en: 'Oil Slick' },
  tplAurora: { de: 'Nordlicht', en: 'Aurora' },
  tplCopperflip: { de: 'Kupferflip', en: 'Copper Flip' },
  tplMidnight: { de: 'Mitternacht', en: 'Midnight' },
};

export function translate(key: I18nKey, lang: Lang): string {
  return STRINGS[key][lang];
}
