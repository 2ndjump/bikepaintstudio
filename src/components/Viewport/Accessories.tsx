import type { FrameAnchors, FrameGeometryDesc } from '../../geometry/frame';

interface Props {
  anchors: FrameAnchors;
  frame?: FrameGeometryDesc;
}

// All bolt-on accessories (seatpost, BB shell, dropouts, etc.) have been
// stripped from the parametric model — only the frame tubes themselves remain.
export function Accessories(_: Props) {
  return null;
}
