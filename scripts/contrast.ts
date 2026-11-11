import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

/**
 * Prints WCAG contrast ratios of a high contrast theme against its background, for the upstream
 * theme and for the theme in `themes/<theme>.ts`. It checks the targets of the theme and exits
 * with code 1 when a target fails. The themes that it can check are the keys of `themes` below.
 *
 * The script applies the theme in a temporary HOME with stub `defaults`, `rex`, and `osascript`
 * commands. Then it runs headless Neovim with the written `colors.lua` and reads the resolved
 * highlight groups. The new theme loads with the other 'background' first, then the script sets
 * 'background', so that the check also covers the switch. Upstream colors come from the upstream
 * Neovim colorscheme and from the Ghostty theme files of the upstream plugin.
 *
 * The hue check compares the OKLCH hue of each syntax group and Ghostty palette color with the
 * upstream color. It ignores gray colors (OKLCH chroma less than 0.02), because they have no
 * stable hue.
 *
 * Usage:
 *
 *     bun run scripts/contrast.ts zenwritten
 *     bun run scripts/contrast.ts kanagawa --plugins ~/.local/share/nvim/lazy
 *
 * The `--plugins` directory must contain the plugins of the theme. The default is the lazy.nvim
 * plugin directory. Set `MSH_THEME_PICKER_THEMES_DIR` to check a theme module from a different
 * directory, for example a copy of the theme with the upstream colors. The checks must fail for
 * that copy.
 */

const repoRoot = path.join(import.meta.dirname, "..");
const variants = ["dark", "light"] as const;
type Background = (typeof variants)[number];

interface ThemeSpec {
  plugins: readonly string[];
  upstreamLua: string;
  upstreamGhostty: Record<Background, string>;
  ghostty: Record<Background, string>;
  syntaxGroups: readonly string[];
  accentGroups: readonly string[];
  syntaxMinimum: number;
}

const themes: Record<string, ThemeSpec> = {
  zenwritten: {
    plugins: ["lush.nvim", "zenbones.nvim"],
    upstreamLua: "vim.cmd.colorscheme('zenwritten')",
    upstreamGhostty: {
      dark: "zenbones.nvim/extras/ghostty/zenwritten_dark",
      light: "zenbones.nvim/extras/ghostty/zenwritten_light",
    },
    ghostty: { dark: "zenwritten-dark", light: "zenwritten-light" },
    syntaxGroups: [
      "Statement",
      "Constant",
      "Identifier",
      "String",
      "Function",
      "Type",
      "Special",
      "Delimiter",
      "Comment",
    ],
    accentGroups: [
      "Error",
      "DiagnosticOk",
      "WarningMsg",
      "DiagnosticInfo",
      "DiagnosticHint",
      "MiniIconsCyan",
    ],
    syntaxMinimum: 4.5,
  },
  kanagawa: {
    plugins: ["kanagawa.nvim"],
    upstreamLua: `require('kanagawa').setup({ background = { dark = 'dragon', light = 'lotus' } })
vim.cmd.colorscheme('kanagawa')`,
    upstreamGhostty: {
      dark: "kanagawa.nvim/extras/ghostty/kanagawa-dragon",
      light: "kanagawa.nvim/extras/ghostty/kanagawa-lotus",
    },
    ghostty: { dark: "kanagawa-dragon-hc", light: "kanagawa-lotus-hc" },
    syntaxGroups: [
      "Statement",
      "Keyword",
      "Constant",
      "Number",
      "String",
      "Identifier",
      "Function",
      "Type",
      "Special",
      "Operator",
      "PreProc",
      "Delimiter",
      "@variable.parameter",
      "@variable.builtin",
      "@keyword.return",
      "Comment",
    ],
    accentGroups: ["PreProc", "String", "Identifier", "Function", "Number", "Type"],
    syntaxMinimum: 7,
  },
};

const hexSchema = z
  .string()
  .regex(/^#?[0-9A-Fa-f]{6}$/)
  .transform((hex) => `#${hex.replace("#", "").toUpperCase()}`);
const highlightSchema = z.object({ fg: hexSchema.optional(), bg: hexSchema.optional() });
const probeSchema = z.object({
  groups: z.record(z.string(), highlightSchema),
  terminal: z.array(hexSchema).length(16),
  loads: z.number(),
});
const ghosttySchema = z.object({
  foreground: hexSchema,
  background: hexSchema,
  "selection-background": hexSchema,
  "cursor-color": hexSchema,
  palette: z.array(hexSchema).length(16),
});
type Probe = z.infer<typeof probeSchema>;
type Ghostty = z.infer<typeof ghosttySchema>;

interface Theme {
  neovim: Probe;
  ghostty: Ghostty;
}

const probeLua = `
for _, plugin in ipairs(vim.split(vim.env.CT_PLUGINS, ',')) do
  vim.opt.rtp:prepend(plugin)
end
vim.o.termguicolors = true
if vim.env.CT_CONFIG == 'upstream' then
  vim.o.background = vim.env.CT_BG
  assert(loadstring(vim.env.CT_UPSTREAM))()
else
  vim.o.background = vim.env.CT_BG == 'dark' and 'light' or 'dark'
  dofile(vim.env.CT_CONFIG)[1].config()
end
local loads = 0
vim.api.nvim_create_autocmd('ColorScheme', { callback = function() loads = loads + 1 end })
vim.o.background = vim.env.CT_BG
local function hex(value)
  return value and string.format('#%06X', value) or nil
end
local out = { groups = {}, terminal = {}, loads = loads }
for _, name in ipairs(vim.split(vim.env.CT_GROUPS, ',')) do
  local hl = vim.api.nvim_get_hl(0, { name = name, link = false })
  out.groups[name] = { fg = hex(hl.fg), bg = hex(hl.bg) }
end
for index = 0, 15 do
  out.terminal[index + 1] = vim.g['terminal_color_' .. index]
end
io.stdout:write(vim.json.encode(out))
`;

function linear(hex: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
}

function luminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

function oklch(hex: string): { chroma: number; hue: number } {
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { chroma: Math.hypot(a, bb), hue: (Math.atan2(bb, a) * 180) / Math.PI };
}

function hueDelta(upstream: string, next: string): number | undefined {
  const [a, b] = [oklch(upstream), oklch(next)];
  if (a.chroma < 0.02 || b.chroma < 0.02) {
    return undefined;
  }
  const delta = Math.abs(a.hue - b.hue) % 360;
  return Math.min(delta, 360 - delta);
}

function required(value: string | undefined, what: string): string {
  if (value === undefined) {
    throw new Error(`${what} is not set`);
  }
  return value;
}

function parseGhostty(content: string): Ghostty {
  const entries = content
    .split("\n")
    .map((line) => /^([\w-]+)\s*=\s*"?([^"]*)"?$/.exec(line.trim()))
    .filter((match) => match !== null)
    .map((match) => [match[1] ?? "", match[2] ?? ""] as const);
  const palette = entries
    .filter(([name]) => name === "palette")
    .map(([, entry]) => entry.split("="))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, color]) => color);
  return ghosttySchema.parse({ ...Object.fromEntries(entries), palette });
}

function probeNeovim(
  root: string,
  spec: ThemeSpec,
  plugins: string,
  background: Background,
  config: string,
): Probe {
  const scratch = path.join(root, "nvim-home");
  const groups = new Set(["Normal", ...spec.syntaxGroups, ...spec.accentGroups]);
  const result = Bun.spawnSync(["nvim", "--headless", "--clean", "-l", "-"], {
    stdin: new TextEncoder().encode(probeLua),
    env: {
      ...process.env,
      HOME: scratch,
      XDG_CONFIG_HOME: path.join(scratch, "config"),
      XDG_DATA_HOME: path.join(scratch, "data"),
      XDG_STATE_HOME: path.join(scratch, "state"),
      XDG_CACHE_HOME: path.join(scratch, "cache"),
      CT_PLUGINS: spec.plugins.map((plugin) => path.join(plugins, plugin)).join(","),
      CT_UPSTREAM: spec.upstreamLua,
      CT_BG: background,
      CT_CONFIG: config,
      CT_GROUPS: [...groups, "LineNr", "Visual", "Cursor"].join(","),
    },
  });
  if (result.exitCode !== 0) {
    throw new Error(`nvim failed: ${result.stderr.toString()}`);
  }
  return probeSchema.parse(JSON.parse(result.stdout.toString()));
}

async function applyTheme(root: string, name: string): Promise<string> {
  const home = path.join(root, "home");
  const bin = path.join(root, "bin");
  await mkdir(path.join(home, ".config", "ghostty"), { recursive: true });
  await mkdir(bin, { recursive: true });
  for (const command of ["defaults", "rex", "osascript"]) {
    await writeFile(path.join(bin, command), "#!/bin/sh\nexit 0\n");
    await chmod(path.join(bin, command), 0o755);
  }
  const result = Bun.spawnSync(
    [process.execPath, path.join(repoRoot, "src", "index.ts"), "apply", name],
    {
      env: {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: path.join(home, ".config"),
        MSH_THEME_PICKER_THEMES_DIR:
          process.env.MSH_THEME_PICKER_THEMES_DIR ?? path.join(repoRoot, "themes"),
        PATH: `${bin}:${process.env.PATH}`,
      },
    },
  );
  if (result.exitCode !== 0) {
    throw new Error(`apply failed: ${result.stderr.toString()}`);
  }
  return home;
}

function fg(theme: Theme, group: string): string {
  return required(theme.neovim.groups[group]?.fg, `${group}.fg`);
}

function bg(theme: Theme, group: string): string {
  return required(theme.neovim.groups[group]?.bg, `${group}.bg`);
}

function groupRatio(theme: Theme, group: string): number {
  return contrast(fg(theme, group), bg(theme, "Normal"));
}

function paletteRatio(theme: Theme, index: number): number {
  return contrast(
    required(theme.ghostty.palette[index], `palette ${index}`),
    theme.ghostty.background,
  );
}

function rows(spec: ThemeSpec, theme: Theme): (readonly [string, string, number])[] {
  const background = bg(theme, "Normal");
  const neovim = ["Normal", ...spec.syntaxGroups, "LineNr"].map(
    (group) => [group, fg(theme, group), contrast(fg(theme, group), background)] as const,
  );
  const visual = bg(theme, "Visual");
  const ghosttyBackground = theme.ghostty.background;
  const ghostty = theme.ghostty.palette.map(
    (color, index) =>
      [`ghostty palette ${index}`, color, contrast(color, ghosttyBackground)] as const,
  );
  return [
    ...neovim,
    ["Normal fg on Visual bg", visual, contrast(fg(theme, "Normal"), visual)],
    [
      "ghostty foreground",
      theme.ghostty.foreground,
      contrast(theme.ghostty.foreground, ghosttyBackground),
    ],
    ...ghostty,
  ];
}

function codeGroups(spec: ThemeSpec): string[] {
  return spec.syntaxGroups.filter((group) => group !== "Comment");
}

function colorPartition(spec: ThemeSpec, theme: Theme): string {
  return [...Map.groupBy(spec.syntaxGroups, (group) => fg(theme, group)).values()]
    .map((groups) => groups.join("="))
    .sort()
    .join(" ");
}

function contrastOrder(spec: ThemeSpec, theme: Theme): string {
  return [...codeGroups(spec), "LineNr"]
    .sort((a, b) => groupRatio(theme, b) - groupRatio(theme, a))
    .join(" > ");
}

function checks(
  spec: ThemeSpec,
  background: Background,
  upstream: Theme,
  next: Theme,
): [string, boolean][] {
  const code = codeGroups(spec);
  const hues = [
    ...spec.syntaxGroups.map((group) => hueDelta(fg(upstream, group), fg(next, group))),
    ...upstream.ghostty.palette.map((color, index) =>
      hueDelta(color, required(next.ghostty.palette[index], `palette ${index}`)),
    ),
  ];
  const brightText = background === "dark" ? [7, 15] : [0];
  const textPalette = [...Array(16).keys()].filter((index) => background === "light" || index > 0);
  const comment = groupRatio(next, "Comment");
  return [
    ["Normal fg >= 15:1", groupRatio(next, "Normal") >= 15],
    [
      `code syntax groups >= ${spec.syntaxMinimum}:1`,
      code.every((group) => groupRatio(next, group) >= spec.syntaxMinimum),
    ],
    ["Comment >= 4.5:1", comment >= 4.5],
    [
      "Comment is the dimmest syntax group, and LineNr is dimmer",
      code.every((group) => groupRatio(next, group) > comment) &&
        groupRatio(next, "LineNr") < comment,
    ],
    [
      "syntax groups keep the upstream order of contrast",
      contrastOrder(spec, next) === contrastOrder(spec, upstream),
    ],
    [
      "syntax groups share colors as upstream does",
      colorPartition(spec, next) === colorPartition(spec, upstream),
    ],
    [
      "colors keep the upstream OKLCH hue (delta <= 3 degrees)",
      hues.every((delta) => delta === undefined || delta <= 3),
    ],
    ["a switch of 'background' loads the colors one time", next.neovim.loads === 1],
    [
      "ghostty fg and bg match Neovim Normal",
      next.ghostty.foreground === fg(next, "Normal") &&
        next.ghostty.background === bg(next, "Normal"),
    ],
    [
      "ghostty selection matches Neovim Visual",
      next.ghostty["selection-background"] === bg(next, "Visual"),
    ],
    ["ghostty cursor matches Neovim Cursor", next.ghostty["cursor-color"] === bg(next, "Cursor")],
    [
      `Neovim ${spec.accentGroups.join(", ")} match palette 1 to 6`,
      spec.accentGroups.map((group) => fg(next, group)).join() ===
        next.ghostty.palette.slice(1, 7).join(),
    ],
    [
      "ghostty palette matches Neovim terminal colors",
      next.ghostty.palette.join() === next.neovim.terminal.join(),
    ],
    [
      `ghostty palette ${brightText.join(", ")} >= 15:1`,
      brightText.every((index) => paletteRatio(next, index) >= 15),
    ],
    [
      `ghostty palette ${textPalette.join(", ")} >= 4.5:1`,
      textPalette.every((index) => paletteRatio(next, index) >= 4.5),
    ],
  ];
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    plugins: {
      type: "string",
      default: path.join(os.homedir(), ".local", "share", "nvim", "lazy"),
    },
  },
});
const name = positionals[0] ?? "";
const spec = themes[name];
if (spec === undefined) {
  console.error(`usage: bun run scripts/contrast.ts <${Object.keys(themes).join("|")}>`);
  process.exit(2);
}
const plugins = values.plugins;
const root = await mkdtemp(path.join(os.tmpdir(), `${name}-contrast-`));
const home = await applyTheme(root, name);
const configPath = path.join(home, ".config", "nvim", "lua", "custom", "colors.lua");

let failed = false;
for (const background of variants) {
  const upstream: Theme = {
    neovim: probeNeovim(root, spec, plugins, background, "upstream"),
    ghostty: parseGhostty(
      await readFile(path.join(plugins, spec.upstreamGhostty[background]), "utf8"),
    ),
  };
  const next: Theme = {
    neovim: probeNeovim(root, spec, plugins, background, configPath),
    ghostty: parseGhostty(
      await readFile(
        path.join(home, ".config", "ghostty", "themes", spec.ghostty[background]),
        "utf8",
      ),
    ),
  };

  console.log(
    `\n## ${name} ${background} (bg upstream ${bg(upstream, "Normal")}, new ${bg(next, "Normal")})\n`,
  );
  console.log("| item | upstream | ratio | new | ratio | hue delta |");
  console.log("| --- | --- | ---: | --- | ---: | ---: |");
  const newRows = rows(spec, next);
  for (const [index, [item, color, ratio]] of rows(spec, upstream).entries()) {
    const [, newColor = "", newRatio = 0] = newRows[index] ?? [];
    const delta = hueDelta(color, newColor);
    console.log(
      `| ${item} | ${color} | ${ratio.toFixed(2)} | ${newColor} | ${newRatio.toFixed(2)} | ${delta === undefined ? "gray" : delta.toFixed(2)} |`,
    );
  }
  console.log(`\nsyntax color groups, upstream: ${colorPartition(spec, upstream)}`);
  console.log(`syntax color groups, new:      ${colorPartition(spec, next)}`);
  console.log(`contrast order without Comment, upstream: ${contrastOrder(spec, upstream)}`);
  console.log(`contrast order without Comment, new:      ${contrastOrder(spec, next)}\n`);
  for (const [check, ok] of checks(spec, background, upstream, next)) {
    console.log(`${ok ? "PASS" : "FAIL"} ${check}`);
    failed ||= !ok;
  }
}

await rm(root, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
