type Rgb = readonly [number, number, number];

function channels(hex: string): Rgb {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(
    (start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  return [r, g, b];
}

function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(toLinear);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * Gives the WCAG contrast ratio of two `#RRGGBB` colors.
 *
 * @example
 * contrast("#000000", "#FFFFFF"); // 21
 */
export function contrast(a: string, b: string): number {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Gives the OKLCH lightness (0 to 1), chroma, and hue (0 to 360 degrees) of a `#RRGGBB` color.
 *
 * @example
 * oklch("#FFFFFF").lightness; // 1
 */
export function oklch(hex: string): { lightness: number; chroma: number; hue: number } {
  const [r = 0, g = 0, b = 0] = channels(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    chroma: Math.hypot(a, bb),
    hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/**
 * Gives the angle between the OKLCH hues of two colors, from 0 to 180 degrees.
 *
 * @example
 * hueDistance("#FF0000", "#FF0000"); // 0
 */
export function hueDistance(a: string, b: string): number {
  const delta = Math.abs(oklch(a).hue - oklch(b).hue) % 360;
  return Math.min(delta, 360 - delta);
}

function fromOklch(lightness: number, chroma: number, hue: number): string | undefined {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (rgb.some((value) => value < -1e-6 || value > 1 + 1e-6)) {
    return undefined;
  }
  return toHex(rgb.map((value) => Math.round(Math.min(1, Math.max(0, fromLinear(value))) * 255)));
}

/**
 * Gives a `#RRGGBB` color with the OKLCH hue of `hex` and the OKLCH lightness `lightness`. When
 * the color is outside sRGB, the chroma decreases until the color is in sRGB. For a color that is
 * not gray, the result is the rounded color near the target that has the smallest hue error.
 *
 * @example
 * withLightness("#C4746E", 0.75); // a lighter red with the same hue
 */
export function withLightness(hex: string, lightness: number): string {
  const target = Math.min(1, Math.max(0, lightness));
  const { chroma, hue } = oklch(hex);
  let reduced = chroma;
  let out = fromOklch(target, reduced, hue);
  while (out === undefined && reduced > 0) {
    reduced = Math.max(0, reduced - 0.0005);
    out = fromOklch(target, reduced, hue);
  }
  if (out === undefined) {
    throw new Error(`no sRGB color for ${hex} at lightness ${target}`);
  }
  if (chroma < 0.005) {
    return out;
  }
  const rgb = channels(out).map((value) => Math.round(value * 255));
  const offsets = [-2, -1, 0, 1, 2];
  const candidates = offsets.flatMap((dr) =>
    offsets.flatMap((dg) =>
      offsets.map((db) => [dr, dg, db].map((delta, index) => (rgb[index] ?? 0) + delta)),
    ),
  );
  function score(candidate: string): number {
    return hueDistance(candidate, hex) + Math.abs(oklch(candidate).lightness - target) * 400;
  }
  return candidates
    .filter((candidate) => candidate.every((value) => value >= 0 && value <= 255))
    .map(toHex)
    .reduce((best, candidate) => (score(candidate) < score(best) ? candidate : best));
}
