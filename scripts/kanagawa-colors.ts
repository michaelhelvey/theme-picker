import { contrast, hueDistance, oklch, withLightness } from "./color";

/**
 * Prints the high contrast kanagawa palettes (`dragonPalette` and `lotusPalette` in
 * `themes/kanagawa.ts`) from the upstream kanagawa.nvim colors. Copy the output into the theme,
 * then run `bun run scripts/contrast.ts kanagawa` to check it.
 *
 * Each color keeps its OKLCH hue. The script finds the OKLCH lightness that gives the target
 * contrast against the upstream background. The target contrast comes from the role of the color:
 *
 * - `foreground`: 15.6:1.
 * - `bright`: 15.1:1 (dark palette 7 must be 15:1 or more).
 * - `comment`: 4.9:1. `dim` colors (line numbers, whitespace) increase by the same factor as
 *   the comment, thus they stay dimmer than the comment.
 * - `syntax` and `other`: a log-log line that maps the dimmest upstream syntax color to 7.3:1 and
 *   the brightest to 12:1. Thus the colors keep the upstream order of contrast.
 *
 * No target is more than 16.5:1, and no color gets less contrast than upstream.
 *
 * Usage:
 *
 *     bun run scripts/kanagawa-colors.ts
 */

type Role = "foreground" | "bright" | "comment" | "dim" | "syntax" | "other";

interface Variant {
  name: string;
  background: string;
  colors: readonly (readonly [name: string, upstream: string, role: Role])[];
}

const dragon: Variant = {
  name: "dragonPalette",
  background: "#181616",
  colors: [
    ["dragonWhite", "#C5C9C5", "foreground"],
    ["dragonAsh", "#737C73", "comment"],
    ["dragonGreen2", "#8A9A7B", "syntax"],
    ["dragonPink", "#A292A3", "syntax"],
    ["dragonOrange", "#B6927B", "syntax"],
    ["dragonYellow", "#C4B28A", "syntax"],
    ["dragonGray", "#A6A69C", "syntax"],
    ["dragonBlue2", "#8BA4B0", "syntax"],
    ["dragonViolet", "#8992A7", "syntax"],
    ["dragonRed", "#C4746E", "syntax"],
    ["dragonAqua", "#8EA4A2", "syntax"],
    ["dragonGray2", "#9E9B93", "syntax"],
    ["dragonTeal", "#949FB5", "syntax"],
    ["katanaGray", "#717C7C", "dim"],
    ["oldWhite", "#C8C093", "bright"],
    ["fujiWhite", "#DCD7BA", "other"],
    ["dragonGray3", "#7A8382", "other"],
    ["dragonBlack6", "#625E5A", "dim"],
    ["samuraiRed", "#E82424", "other"],
    ["springGreen", "#98BB6C", "other"],
    ["roninYellow", "#FF9E3B", "other"],
    ["dragonBlue", "#658594", "other"],
    ["waveAqua1", "#6A9589", "other"],
    ["dragonGreen", "#87A987", "other"],
    ["waveRed", "#E46876", "other"],
    ["carpYellow", "#E6C384", "other"],
    ["springBlue", "#7FB4CA", "other"],
    ["springViolet1", "#938AA9", "other"],
    ["waveAqua2", "#7AA89F", "other"],
    ["dragonOrange2", "#B98D7B", "other"],
  ],
};

const lotus: Variant = {
  name: "lotusPalette",
  background: "#F2ECBC",
  colors: [
    ["lotusInk1", "#545464", "foreground"],
    ["lotusGray3", "#8A8980", "comment"],
    ["lotusGreen", "#6F894E", "syntax"],
    ["lotusPink", "#B35B79", "syntax"],
    ["lotusOrange", "#CC6D00", "syntax"],
    ["lotusYellow", "#77713F", "syntax"],
    ["lotusBlue5", "#5D57A3", "syntax"],
    ["lotusBlue4", "#4D699B", "syntax"],
    ["lotusViolet4", "#624C83", "syntax"],
    ["lotusYellow2", "#836F4A", "syntax"],
    ["lotusRed", "#C84053", "syntax"],
    ["lotusAqua", "#597B75", "syntax"],
    ["lotusTeal1", "#4E8CA2", "syntax"],
    ["lotusTeal2", "#6693BF", "syntax"],
    ["lotusInk2", "#43436C", "other"],
    ["lotusViolet2", "#766B90", "other"],
    ["lotusViolet1", "#A09CAC", "dim"],
    ["lotusRed3", "#E82424", "other"],
    ["lotusOrange2", "#E98A00", "other"],
    ["lotusTeal3", "#5A7785", "other"],
    ["lotusAqua2", "#5E857A", "other"],
    ["lotusRed2", "#D7474B", "other"],
    ["lotusGreen2", "#6E915F", "other"],
  ],
};

function solve(hex: string, background: string, target: number, dark: boolean): string {
  let [low, high] = [0, 1];
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (dark === contrast(withLightness(hex, middle), background) < target) {
      low = middle;
    } else {
      high = middle;
    }
  }
  let out = withLightness(hex, dark ? high : low);
  for (let step = 0; contrast(out, background) < target && step < 50; step++) {
    out = withLightness(hex, oklch(out).lightness + (dark ? 0.002 : -0.002));
  }
  return out;
}

function generate(variant: Variant, dark: boolean): string {
  function ratio(hex: string): number {
    return contrast(hex, variant.background);
  }
  const comment = ratio(variant.colors.find(([, , role]) => role === "comment")?.[1] ?? "");
  const syntax = variant.colors
    .filter(([, , role]) => role === "syntax")
    .map(([, hex]) => ratio(hex));
  const [x0, x1] = [Math.log(Math.min(...syntax)), Math.log(Math.max(...syntax))];
  const [y0, y1] = [Math.log(7.3), Math.log(12)];
  function scaled(upstream: number): number {
    return (4.9 * upstream) / comment;
  }
  function line(upstream: number): number {
    return Math.exp(y0 + ((Math.log(upstream) - x0) * (y1 - y0)) / (x1 - x0));
  }
  const targets: Record<Role, (upstream: number) => number> = {
    foreground: () => 15.6,
    bright: () => 15.1,
    comment: scaled,
    dim: scaled,
    syntax: line,
    other: line,
  };
  const lines = variant.colors.map(([name, upstream, role]) => {
    const before = ratio(upstream);
    const target = Math.max(before, Math.min(targets[role](before), 16.5));
    const next = target === before ? upstream : solve(upstream, variant.background, target, dark);
    console.error(
      `${name.padEnd(14)} ${upstream} ${before.toFixed(2)} -> ${next} ${ratio(next).toFixed(2)} hue delta ${hueDistance(upstream, next).toFixed(2)}`,
    );
    return `  ${name}: "${next}",`;
  });
  return [`const ${variant.name} = {`, ...lines, "} as const;"].join("\n");
}

console.log(`${generate(dragon, true)}\n\n${generate(lotus, false)}`);
