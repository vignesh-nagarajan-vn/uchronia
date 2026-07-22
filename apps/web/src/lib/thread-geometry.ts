/**
 * The red thread's geometry (§7.4): slack string pinned to a corkboard.
 * A thread between two pins bulges leftward like a hanging catenary turned
 * sideways; longer spans and deeper nesting bulge further.
 */
export interface ThreadPin {
  x: number
  y: number
}

/** Horizontal bulge for a thread spanning `dy` pixels, at nesting `index`. */
export function threadSag(dy: number, index = 0): number {
  const base = Math.min(72, 24 + Math.abs(dy) * 0.08)
  return base + index * 14
}

/** SVG path for one thread. Two cubic segments through a sagged midpoint. */
export function computeThreadPath(from: ThreadPin, to: ThreadPin, index = 0): string {
  const sag = threadSag(to.y - from.y, index)
  const midY = (from.y + to.y) / 2
  const bulgeX = Math.min(from.x, to.x) - sag
  const c = Math.abs(to.y - from.y) / 4
  return [
    `M ${from.x} ${from.y}`,
    `C ${from.x - sag * 0.9} ${from.y + Math.sign(to.y - from.y) * c * 0.4}, ${bulgeX} ${midY - c * 0.3}, ${bulgeX} ${midY}`,
    `C ${bulgeX} ${midY + c * 0.3}, ${to.x - sag * 0.9} ${to.y - Math.sign(to.y - from.y) * c * 0.4}, ${to.x} ${to.y}`,
  ].join(' ')
}

/** Approximate path length, for the draw-on dash animation. */
export function approximateThreadLength(from: ThreadPin, to: ThreadPin, index = 0): number {
  const sag = threadSag(to.y - from.y, index)
  return Math.abs(to.y - from.y) + sag * 2.2 + Math.abs(to.x - from.x)
}
