import type { FrameAnchors } from '../../geometry/frame';

interface Props {
  anchors: FrameAnchors;
}

// Cockpit components (stem, headset, handlebar, etc.) have been removed from
// the parametric model — only the frame tubes themselves remain.
export function Cockpit(_: Props) {
  return null;
}
