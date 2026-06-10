export type ZoneId =
  | 'headTube'
  | 'topTube'
  | 'downTube'
  | 'seatTube'
  | 'seatStays'
  | 'chainStays'
  | 'forkLegs'
  | 'forkCrown'
  | 'frontRim'
  | 'rearRim';

export const ALL_ZONES: ZoneId[] = [
  'headTube',
  'topTube',
  'downTube',
  'seatTube',
  'seatStays',
  'chainStays',
  'forkLegs',
  'forkCrown',
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
  forkLegs: 'Fork Legs',
  forkCrown: 'Fork Crown',
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
  'forkLegs',
  'forkCrown',
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

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
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
  | 'splashes';

export interface PatternLayer extends LayerBase {
  type: 'pattern';
  pattern: PatternKind;
  color: string;
  background: string;
  scale: number;
  rotation: number;
  intensity: number;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  x: number;
  y: number;
  scale: number;
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
}

export type DistortionKind = 'gaussian' | 'directional' | 'motion';

export interface DistortionLayer extends LayerBase {
  type: 'distortion';
  kind: DistortionKind;
  amount: number;
  angle: number;
}

export type Layer =
  | SolidColorLayer
  | PatternLayer
  | ImageLayer
  | DecalLayer
  | DistortionLayer;

export interface ZoneState {
  finish: FinishType;
  layers: Layer[];
  chameleonColors: [string, string, string];
}

export interface RimParams {
  depth: number;
  width: number;
  spokeCount: number;
}

export interface DesignState {
  activeZone: ZoneId;
  zones: Record<ZoneId, ZoneState>;
  rim: RimParams;
}

export const DEFAULT_CHAMELEON_COLORS: [string, string, string] = [
  '#1e3a8a',
  '#a855f7',
  '#14b8a6',
];

export function makeDefaultZoneState(color = '#888888'): ZoneState {
  return {
    finish: 'matte',
    chameleonColors: [...DEFAULT_CHAMELEON_COLORS] as [string, string, string],
    layers: [
      {
        id: 'base-' + Math.random().toString(36).slice(2, 8),
        name: 'Base Color',
        type: 'solid',
        color,
        visible: true,
        opacity: 1,
        blendMode: 'normal',
      },
    ],
  };
}
