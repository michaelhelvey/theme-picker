import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

/**
 * Prints WCAG contrast ratios of the zenwritten theme against its background, for upstream
 * zenwritten and for the theme in `themes/zenwritten.ts`. It checks the targets of the theme and
 * exits with code 1 when a target fails.
 *
 * The script applies the theme in a temporary HOME with stub `defaults`, `rex`, and `osascript`
 * commands. Then it runs headless Neovim with the written `colors.lua` and reads the resolved
 * highlight groups. The new theme loads with the other 'background' first, then the script sets
 * 'background', so that the check also covers the switch. Upstream colors come from
 * `:colorscheme zenwritten` and from `extras/ghostty` in zenbones.nvim.
 *
 * Usage:
 *
 *     bun run scripts/contrast.ts
 *     bun run scripts/contrast.ts --plugins ~/.local/share/nvim/lazy
 *
 * The `--plugins` directory must contain `zenbones.nvim` and `lush.nvim`. The default is the
 * lazy.nvim plugin directory.
 */

const repoRoot = path.join(import.meta.dirname, "..");
const variants = ["dark", "light"] as const;
type Background = (typeof variants)[number];

const syntaxGroups = [
  "Statement",
  "Constant",
  "Identifier",
  "String",
  "Function",
  "Type",
  "Special",
  "Delimiter",
  "Comment",
] as const;
const textGroups = ["Normal", ...syntaxGroups, "LineNr"] as const;
const accentGroups = [
  "Error",
  "DiagnosticOk",
  "WarningMsg",
  "DiagnosticInfo",
  "DiagnosticHint",
  "MiniIconsCyan",
] as const;
const probedGroups = [...textGroups, ...accentGroups, "Visual", "Cursor"] as const;

const hexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const highlightSchema = z.object({ fg: hexSchema.optional(), bg: hexSchema.optional() });
const probeSchema = z.object({
  groups: z.record(z.string(), highlightSchema),
  terminal: z.array(hexSchema).length(16),
  loads: z.number(),
});
type Probe = z.infer<typeof probeSchema>;

interface Ghostty {
  foreground: string;
  background: string;
  selectionBackground: string;
  cursorColor: string;
  palette: string[];
}

interface Theme {
  neovim: Probe;
  ghostty: Ghostty;
}

const probeLua = `
vim.opt.rtp:prepend(vim.env.ZW_PLUGINS .. '/lush.nvim')
vim.opt.rtp:prepend(vim.env.ZW_PLUGINS .. '/zenbones.nvim')
vim.o.termguicolors = true
if vim.env.ZW_CONFIG == 'upstream' then
  vim.o.background = vim.env.ZW_BG
  vim.cmd.colorscheme('zenwritten')
else
  vim.o.background = vim.env.ZW_BG == 'dark' and 'light' or 'dark'
  dofile(vim.env.ZW_CONFIG)[1].config()
end
local loads = 0
vim.api.nvim_create_autocmd('ColorScheme', { callback = function() loads = loads + 1 end })
vim.o.background = vim.env.ZW_BG
local function hex(value)
  return value and string.format('#%06X', value) or nil
end
local out = { groups = {}, terminal = {}, loads = loads }
for _, name in ipairs(vim.split(vim.env.ZW_GROUPS, ',')) do
  local hl = vim.api.nvim_get_hl(0, { name = name, link = false })
  out.groups[name] = { fg = hex(hl.fg), bg = hex(hl.bg) }
end
for index = 0, 15 do
  out.terminal[index + 1] = string.upper(vim.g['terminal_color_' .. index])
end
io.stdout:write(vim.json.encode(out))
`;

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

function required(value: string | undefined, what: string): string {
  if (value === undefined) {
    throw new Error(`${what} is not set`);
  }
  return value.toUpperCase();
}

function parseGhostty(content: string): Ghostty {
  const entries = content
    .split("\n")
    .map((line) => /^([\w-]+)\s*=\s*"?([^"]*)"?$/.exec(line.trim()))
    .filter((match) => match !== null)
    .map((match) => [match[1] ?? "", match[2] ?? ""] as const);
  const settings = new Map(entries);
  const palette = entries
    .filter(([name]) => name === "palette")
    .map(([, entry]) => entry.split("="))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, color]) => required(color, "palette color"));
  return {
    foreground: required(settings.get("foreground"), "foreground"),
    background: required(settings.get("background"), "background"),
    selectionBackground: required(settings.get("selection-background"), "selection-background"),
    cursorColor: required(settings.get("cursor-color"), "cursor-color"),
    palette,
  };
}

function probeNeovim(root: string, plugins: string, background: Background, config: string): Probe {
  const scratch = path.join(root, "nvim-home");
  const result = Bun.spawnSync(["nvim", "--headless", "--clean", "-l", "-"], {
    stdin: new TextEncoder().encode(probeLua),
    env: {
      ...process.env,
      HOME: scratch,
      XDG_CONFIG_HOME: path.join(scratch, "config"),
      XDG_DATA_HOME: path.join(scratch, "data"),
      XDG_STATE_HOME: path.join(scratch, "state"),
      XDG_CACHE_HOME: path.join(scratch, "cache"),
      ZW_PLUGINS: plugins,
      ZW_BG: background,
      ZW_CONFIG: config,
      ZW_GROUPS: probedGroups.join(","),
    },
  });
  if (result.exitCode !== 0) {
    throw new Error(`nvim failed: ${result.stderr.toString()}`);
  }
  return probeSchema.parse(JSON.parse(result.stdout.toString()));
}

async function applyTheme(root: string): Promise<string> {
  const home = path.join(root, "home");
  const bin = path.join(root, "bin");
  await mkdir(path.join(home, ".config", "ghostty"), { recursive: true });
  await mkdir(bin, { recursive: true });
  for (const command of ["defaults", "rex", "osascript"]) {
    await writeFile(path.join(bin, command), "#!/bin/sh\nexit 0\n");
    await chmod(path.join(bin, command), 0o755);
  }
  const result = Bun.spawnSync(
    [process.execPath, path.join(repoRoot, "src", "index.ts"), "apply", "zenwritten"],
    {
      env: {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: path.join(home, ".config"),
        MSH_THEME_PICKER_THEMES_DIR: path.join(repoRoot, "themes"),
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

function partition(theme: Theme): string {
  const byColor = Map.groupBy(syntaxGroups, (group) => fg(theme, group));
  return [...byColor.values()]
    .map((groups) => groups.join("="))
    .sort()
    .join(" ");
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

function order(theme: Theme): string {
  return [...syntaxGroups, "LineNr"]
    .sort((a, b) => groupRatio(theme, b) - groupRatio(theme, a))
    .join(" > ");
}

function rows(theme: Theme): (readonly [string, string, number])[] {
  const background = bg(theme, "Normal");
  const neovim = textGroups.map(
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

function checks(background: Background, upstream: Theme, next: Theme): [string, boolean][] {
  const brightText = background === "dark" ? [7, 15] : [0];
  const textPalette = [...Array(16).keys()].filter((index) => background === "light" || index > 0);
  return [
    ["Normal fg >= 15:1", groupRatio(next, "Normal") >= 15],
    ["Comment >= 4.5:1", groupRatio(next, "Comment") >= 4.5],
    ["syntax groups keep the upstream order of contrast", order(next) === order(upstream)],
    ["syntax groups share colors as upstream does", partition(next) === partition(upstream)],
    ["a switch of 'background' loads the colors one time", next.neovim.loads === 1],
    [
      "ghostty fg and bg match Neovim Normal",
      next.ghostty.foreground === fg(next, "Normal") &&
        next.ghostty.background === bg(next, "Normal"),
    ],
    [
      "ghostty selection matches Neovim Visual",
      next.ghostty.selectionBackground === bg(next, "Visual"),
    ],
    ["ghostty cursor matches Neovim Cursor", next.ghostty.cursorColor === bg(next, "Cursor")],
    [
      "Neovim accent colors match palette 1 to 6",
      accentGroups.map((group) => fg(next, group)).join() === next.ghostty.palette.slice(1, 7).join(),
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

const { values } = parseArgs({
  options: {
    plugins: {
      type: "string",
      default: path.join(os.homedir(), ".local", "share", "nvim", "lazy"),
    },
  },
});
const plugins = values.plugins;
const root = await mkdtemp(path.join(os.tmpdir(), "zenwritten-contrast-"));
const home = await applyTheme(root);
const configPath = path.join(home, ".config", "nvim", "lua", "custom", "colors.lua");

let failed = false;
for (const background of variants) {
  const upstream: Theme = {
    neovim: probeNeovim(root, plugins, background, "upstream"),
    ghostty: parseGhostty(
      await readFile(
        path.join(plugins, "zenbones.nvim", "extras", "ghostty", `zenwritten_${background}`),
        "utf8",
      ),
    ),
  };
  const next: Theme = {
    neovim: probeNeovim(root, plugins, background, configPath),
    ghostty: parseGhostty(
      await readFile(
        path.join(home, ".config", "ghostty", "themes", `zenwritten-${background}`),
        "utf8",
      ),
    ),
  };

  console.log(
    `\n## ${background} (bg upstream ${bg(upstream, "Normal")}, new ${bg(next, "Normal")})\n`,
  );
  console.log("| item | upstream | ratio | new | ratio |");
  console.log("| --- | --- | ---: | --- | ---: |");
  const newRows = rows(next);
  for (const [index, [item, color, ratio]] of rows(upstream).entries()) {
    const [, newColor = "", newRatio = 0] = newRows[index] ?? [];
    console.log(
      `| ${item} | ${color} | ${ratio.toFixed(2)} | ${newColor} | ${newRatio.toFixed(2)} |`,
    );
  }
  console.log(`\nsyntax color groups, upstream: ${partition(upstream)}`);
  console.log(`syntax color groups, new:      ${partition(next)}`);
  console.log(`contrast order, upstream: ${order(upstream)}`);
  console.log(`contrast order, new:      ${order(next)}\n`);
  for (const [name, ok] of checks(background, upstream, next)) {
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
    failed ||= !ok;
  }
}

await rm(root, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
