import type { DesignState, Layer, ZoneId, ZoneState } from './types';
import { ALL_ZONES } from './types';

const VERSION = '1';

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function attr(name: string, value: string | number | boolean): string {
  return ` ${name}="${esc(String(value))}"`;
}

function layerToXML(layer: Layer, indent: string): string {
  const base =
    attr('id', layer.id) +
    attr('name', layer.name) +
    attr('visible', layer.visible) +
    attr('opacity', layer.opacity) +
    attr('blendMode', layer.blendMode);

  switch (layer.type) {
    case 'solid':
      return `${indent}<layer type="solid"${base}${attr('color', layer.color)} />`;
    case 'pattern':
      return (
        `${indent}<layer type="pattern"${base}` +
        attr('pattern', layer.pattern) +
        attr('color', layer.color) +
        attr('scale', layer.scale) +
        attr('rotation', layer.rotation) +
        attr('intensity', layer.intensity) +
        ' />'
      );
    case 'image':
      return (
        `${indent}<layer type="image"${base}` +
        attr('x', layer.x) +
        attr('y', layer.y) +
        attr('scale', layer.scale) +
        attr('rotation', layer.rotation) +
        attr('brightness', layer.brightness) +
        attr('contrast', layer.contrast) +
        attr('saturation', layer.saturation) +
        attr('hueShift', layer.hueShift) +
        attr('dodge', layer.dodge) +
        attr('burn', layer.burn) +
        attr('levelsBlack', layer.levelsBlack) +
        attr('levelsGamma', layer.levelsGamma) +
        attr('levelsWhite', layer.levelsWhite) +
        `>\n${indent}  <src>${esc(layer.src)}</src>\n${indent}</layer>`
      );
    case 'decal':
      return (
        `${indent}<layer type="decal"${base}` +
        attr('font', layer.font) +
        attr('size', layer.size) +
        attr('color', layer.color) +
        attr('outlineColor', layer.outlineColor) +
        attr('outlineWidth', layer.outlineWidth) +
        attr('letterSpacing', layer.letterSpacing) +
        attr('x', layer.x) +
        attr('y', layer.y) +
        attr('rotation', layer.rotation) +
        attr('glyphRotation', layer.glyphRotation) +
        `>\n${indent}  <text>${esc(layer.text)}</text>\n${indent}</layer>`
      );
    case 'distortion':
      return (
        `${indent}<layer type="distortion"${base}` +
        attr('kind', layer.kind) +
        attr('amount', layer.amount) +
        attr('angle', layer.angle) +
        ' />'
      );
  }
}

function zoneToXML(id: ZoneId, zone: ZoneState): string {
  const [a, b, c] = zone.chameleonColors;
  const layers = zone.layers.map((l) => layerToXML(l, '      ')).join('\n');
  return (
    `    <zone id="${id}" finish="${zone.finish}" baseColor="${esc(zone.baseColor)}">\n` +
    `      <chameleonColors a="${esc(a)}" b="${esc(b)}" c="${esc(c)}" />\n` +
    `      <layers>\n${layers}\n      </layers>\n` +
    `    </zone>`
  );
}

export function designToXML(state: DesignState): string {
  const zones = ALL_ZONES.map((id) => zoneToXML(id, state.zones[id])).join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<bikeDesign version="${VERSION}" activeZone="${state.activeZone}">\n` +
    `  <rim` +
    attr('depth', state.rim.depth) +
    attr('width', state.rim.width) +
    attr('spokeCount', state.rim.spokeCount) +
    ` />\n` +
    `  <zones>\n${zones}\n  </zones>\n` +
    `</bikeDesign>\n`
  );
}

function str(el: Element, name: string, fallback = ''): string {
  return el.getAttribute(name) ?? fallback;
}

function num(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name);
  return v !== null ? parseFloat(v) : fallback;
}

function bool(el: Element, name: string, fallback = true): boolean {
  const v = el.getAttribute(name);
  return v !== null ? v === 'true' : fallback;
}

function parseLayer(el: Element): Layer | null {
  const type = el.getAttribute('type');
  const base = {
    id: str(el, 'id'),
    name: str(el, 'name'),
    visible: bool(el, 'visible'),
    opacity: num(el, 'opacity', 1),
    blendMode: str(el, 'blendMode', 'normal') as Layer['blendMode'],
  };
  switch (type) {
    case 'solid':
      return { ...base, type: 'solid', color: str(el, 'color', '#cccccc') };
    case 'pattern':
      return {
        ...base,
        type: 'pattern',
        pattern: str(el, 'pattern', 'hexagons') as import('./types').PatternKind,
        color: str(el, 'color', '#ffffff'),
        scale: num(el, 'scale', 10),
        rotation: num(el, 'rotation', 0),
        intensity: num(el, 'intensity', 1),
      };
    case 'image': {
      const srcEl = el.querySelector('src');
      return {
        ...base,
        type: 'image',
        src: srcEl?.textContent ?? '',
        x: num(el, 'x', 0.5),
        y: num(el, 'y', 0.5),
        scale: num(el, 'scale', 1),
        rotation: num(el, 'rotation', 0),
        brightness: num(el, 'brightness', 0),
        contrast: num(el, 'contrast', 0),
        saturation: num(el, 'saturation', 0),
        hueShift: num(el, 'hueShift', 0),
        dodge: num(el, 'dodge', 0),
        burn: num(el, 'burn', 0),
        levelsBlack: num(el, 'levelsBlack', 0),
        levelsGamma: num(el, 'levelsGamma', 1),
        levelsWhite: num(el, 'levelsWhite', 1),
      };
    }
    case 'decal': {
      const textEl = el.querySelector('text');
      return {
        ...base,
        type: 'decal',
        text: textEl?.textContent ?? '',
        font: str(el, 'font', 'Oswald'),
        size: num(el, 'size', 64),
        color: str(el, 'color', '#ffffff'),
        outlineColor: str(el, 'outlineColor', '#000000'),
        outlineWidth: num(el, 'outlineWidth', 0),
        letterSpacing: num(el, 'letterSpacing', 0),
        x: num(el, 'x', 0.5),
        y: num(el, 'y', 0.5),
        rotation: num(el, 'rotation', 0),
        glyphRotation: num(el, 'glyphRotation', 0),
      };
    }
    case 'distortion':
      return {
        ...base,
        type: 'distortion',
        kind: str(el, 'kind', 'gaussian') as import('./types').DistortionKind,
        amount: num(el, 'amount', 6),
        angle: num(el, 'angle', 0),
      };
    default:
      return null;
  }
}

export function xmlToDesign(xml: string): DesignState {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const root = doc.documentElement;

  const rimEl = root.querySelector('rim');
  const rim = {
    depth: rimEl ? num(rimEl, 'depth', 45) : 45,
    width: rimEl ? num(rimEl, 'width', 25) : 25,
    spokeCount: rimEl ? num(rimEl, 'spokeCount', 24) : 24,
  };

  const activeZone = (root.getAttribute('activeZone') ?? 'topTube') as ZoneId;

  const zones: Partial<Record<ZoneId, ZoneState>> = {};
  for (const zoneEl of Array.from(root.querySelectorAll('zones > zone'))) {
    const id = zoneEl.getAttribute('id') as ZoneId;
    if (!ALL_ZONES.includes(id)) continue;

    const ccEl = zoneEl.querySelector('chameleonColors');
    const chameleonColors: [string, string, string] = [
      ccEl?.getAttribute('a') ?? '#1e3a8a',
      ccEl?.getAttribute('b') ?? '#a855f7',
      ccEl?.getAttribute('c') ?? '#14b8a6',
    ];

    let layers: Layer[] = [];
    for (const layerEl of Array.from(zoneEl.querySelectorAll('layers > layer'))) {
      const l = parseLayer(layerEl);
      if (l) layers.push(l);
    }

    // Prefer the explicit baseColor attribute; fall back to promoting a
    // legacy base solid layer (older files stored it in the stack).
    let baseColor = zoneEl.getAttribute('baseColor') ?? undefined;
    if (baseColor === undefined && layers.length > 0 && layers[0].type === 'solid') {
      baseColor = layers[0].color;
      layers = layers.slice(1);
    }

    zones[id] = {
      finish: (zoneEl.getAttribute('finish') ?? 'glossy') as import('./types').FinishType,
      baseColor: baseColor ?? '#cccccc',
      chameleonColors,
      layers,
    };
  }

  const fullZones = Object.fromEntries(
    ALL_ZONES.map((z) => [
      z,
      zones[z] ?? {
        finish: 'glossy' as const,
        baseColor: '#cccccc',
        chameleonColors: ['#1e3a8a', '#a855f7', '#14b8a6'] as [string, string, string],
        layers: [],
      },
    ]),
  ) as Record<ZoneId, ZoneState>;

  return { activeZone, zones: fullZones, rim };
}
