/** A soft pastel color whose hue is far from the previous one. */
let lastHue = Math.random() * 360
export function randomPastel() {
  lastHue = (lastHue + 60 + Math.random() * 240) % 360
  return `hsl(${Math.round(lastHue)} 78% 74%)`
}
