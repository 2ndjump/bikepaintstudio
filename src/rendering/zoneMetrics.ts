import type { ZoneId } from '../state/types';

/**
 * Per-zone surface aspect (mean circumference-per-unit-u ÷ length-per-unit-v),
 * measured from the tube geometry once the frame is built. The compositor uses
 * it to keep decals isotropic on the surface despite the fixed-aspect zone
 * canvas. Unset (e.g. rims) means "don't correct".
 */
const zoneAspect: Partial<Record<ZoneId, number>> = {};

export function setZoneAspect(zone: ZoneId, aspect: number): void {
  zoneAspect[zone] = aspect;
}

export function getZoneAspect(zone: ZoneId): number | undefined {
  return zoneAspect[zone];
}
