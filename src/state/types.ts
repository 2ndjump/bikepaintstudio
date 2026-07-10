export type ZoneId =
  | 'headTube'
  | 'topTube'
  | 'downTube'
  | 'seatTube'
  | 'seatStays'
  | 'chainStays'
  | 'fork'
  | 'frontRim'
  | 'rearRim';

export const ALL_ZONES: ZoneId[] = [
  'headTube',
  'topTube',
  'downTube',
  'seatTube',
  'seatStays',
  'chainStays',
  'fork',
  'frontRim',
  'rearRim',
];

export const ZONE_LABELS: Record<ZoneId, string> = {
  headTube: 'Head Tube',
  topTube: 'Top Tube',
  downTube: 'Down Tube',
  seatTube: 'Seat Tube',
  seatStays: 'Seat Stays',
  chainStays: 'Chain Stays',
  fork: 'Fork',
  frontRim: 'Front Rim',
  rearRim: 'Rear Rim',
};

export const ZONES_PARAMETRIC: ZoneId[] = [
  'headTube',
  'topTube',
  'downTube',
  'seatTube',
  'seatStays',
  'chainStays',
  'fork',
  'frontRim',
  'rearRim',
];

export type FinishType = 'matte' | 'satin' | 'glossy' | 'metallic' | 'chameleon';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'colorDodge'
  | 'colorBurn';

export type EffectKind = 'gaussian' | 'directional' | 'motion';

/** A blur/smear effect applied to a single layer's own pixels (not the layers
 *  beneath it). Attached to any layer via LayerBase.effect. */
export interface LayerEffect {
  kind: EffectKind;
  amount: number;
  angle: number;
}

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  /** Optional per-layer effect (blur/smear). Absent = no effect. */
  effect?: LayerEffect;
  /** Clip to the layer directly below: this layer only shows where that layer
   *  is opaque (e.g. a pattern confined to a shape). */
  clip?: boolean;
  /** Sit BEHIND the global colour dividers: the divider paints over this layer
   *  (so it's hidden in a divider's coloured region) instead of on top of it.
   *  Default (false) = in front of the dividers. */
  behindDivider?: boolean;
}

export interface SolidColorLayer extends LayerBase {
  type: 'solid';
  color: string;
}

export type PatternKind =
  | 'hexagons'
  | 'stripes'
  | 'carbon'
  | 'smoke'
  | 'thread'
  | 'splashes'
  | 'topo'
  | 'marble'
  | 'voronoi'
  | 'camo'
  | 'digicamo'
  | 'circuit'
  | 'mesh';

export interface PatternLayer extends LayerBase {
  type: 'pattern';
  pattern: PatternKind;
  color: string;
  /** Tile density. */
  scale: number;
  /** Per-axis stretch of the pattern fill (1 = no stretch). */
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Out-of-plane tilt (degrees) around the X and Y axes — a 3D-style
   *  perspective tilt on top of the in-plane `rotation`. */
  rotationX: number;
  rotationY: number;
  intensity: number;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  x: number;
  y: number;
  /** Per-axis scale (1 = natural fit). */
  scaleX: number;
  scaleY: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hueShift: number;
  dodge: number;
  burn: number;
  levelsBlack: number;
  levelsGamma: number;
  levelsWhite: number;
}

export interface DecalLayer extends LayerBase {
  type: 'decal';
  text: string;
  font: string;
  size: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  letterSpacing: number;
  x: number;
  y: number;
  rotation: number;
  /** Per-letter rotation (degrees) about each glyph's own centre. Combined
   *  with `rotation` this allows e.g. upright vertically-stacked text. */
  glyphRotation: number;
}

export type ShapeKind =
  | 'rectangle'
  | 'triangle'
  | 'circle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'heart'
  | 'ring'
  | 'cross'
  | 'arrow'
  | 'lightning'
  | 'chevron';

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shape: ShapeKind;
  color: string;
  /** Centre position, 0..1 of the zone canvas. */
  x: number;
  y: number;
  /** Size relative to the part: width = fraction of the zone width (around the
   *  tube), height = fraction of the zone height (along the part's length). */
  width: number;
  height: number;
  rotation: number;
}

export type Layer =
  | SolidColorLayer
  | PatternLayer
  | ImageLayer
  | DecalLayer
  | ShapeLayer;

export interface ZoneState {
  finish: FinishType;
  /** Opaque background fill the layer stack composites on top of. */
  baseColor: string;
  layers: Layer[];
  chameleonColors: [string, string, string];
}

export interface RimParams {
  depth: number;
  width: number;
  spokeCount: number;
}

/**
 * A global colour divider: a world-space line (in the scene's XY side profile,
 * metres) that tints everything BELOW it across all bike parts. Dividers apply
 * in order, so several make horizontal colour bands.
 */
export interface Divider {
  id: string;
  color: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface DesignState {
  activeZone: ZoneId;
  zones: Record<ZoneId, ZoneState>;
  rim: RimParams;
  /** Global colour dividers (world-space), applied over every zone's paint. */
  dividers: Divider[];
}

// Brighter, saturated defaults so the chameleon shift reads clearly (a dark
// navy as colour A made the broad faces — where A dominates — look near-black).
export const DEFAULT_CHAMELEON_COLORS: [string, string, string] = [
  '#3b82f6',
  '#c026d3',
  '#22d3ee',
];

export function makeDefaultZoneState(color = '#888888'): ZoneState {
  return {
    finish: 'matte',
    baseColor: color,
    chameleonColors: [...DEFAULT_CHAMELEON_COLORS] as [string, string, string],
    layers: [],
  };
}
