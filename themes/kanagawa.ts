import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const ghosttyThemesDir = path.join(homeDir, ".config", "ghostty", "themes");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

interface Variant {
  theme: "dragon" | "lotus";
  name: string;
  title: string;
  foreground: string;
  background: string;
  selection: string;
  palette: Readonly<Record<string, string>>;
  terminal: readonly string[];
}

const dragonPalette = {
  dragonWhite: "#EAF1EA",
  dragonAsh: "#7E887E",
  dragonGreen2: "#A5B794",
  dragonPink: "#BFAEC0",
  dragonOrange: "#D5AE95",
  dragonYellow: "#E4D2AA",
  dragonGray: "#C4C4B7",
  dragonBlue2: "#AAC1CC",
  dragonViolet: "#A5AEC3",
  dragonRed: "#E28F88",
  dragonAqua: "#ACC1BF",
  dragonGray2: "#BBB8B0",
  dragonTeal: "#B1BCD2",
  katanaGray: "#7C8888",
  oldWhite: "#F4ECBF",
  fujiWhite: "#FBF6D9",
  dragonGray3: "#959E9D",
  dragonBlack6: "#6B6967",
  samuraiRed: "#FE564B",
  springGreen: "#B7DA8C",
  roninYellow: "#FECA9E",
  dragonBlue: "#7EA0B0",
  waveAqua1: "#83B1A4",
  dragonGreen: "#A2C7A2",
  waveRed: "#FE8893",
  carpYellow: "#FFE6BA",
  springBlue: "#9CD3EA",
  springViolet1: "#AFA5C7",
  waveAqua2: "#99C5BC",
  dragonOrange2: "#D7A996",
} as const;

const lotusPalette = {
  lotusInk1: "#111020",
  lotusGray3: "#65645B",
  lotusGreen: "#344A10",
  lotusPink: "#701F40",
  lotusOrange: "#6D3802",
  lotusYellow: "#403A05",
  lotusBlue5: "#30246D",
  lotusBlue4: "#1A3464",
  lotusViolet4: "#351D53",
  lotusYellow2: "#4B3811",
  lotusRed: "#7B0023",
  lotusAqua: "#23423D",
  lotusTeal1: "#004B5F",
  lotusTeal2: "#214D75",
  lotusInk2: "#1B1840",
  lotusViolet2: "#403458",
  lotusViolet1: "#787484",
  lotusRed3: "#830007",
  lotusOrange2: "#7B4702",
  lotusTeal3: "#253F4B",
  lotusAqua2: "#20483E",
  lotusRed2: "#850118",
  lotusGreen2: "#2E4F1E",
} as const;

const dark: Variant = {
  theme: "dragon",
  name: "kanagawa-dragon-hc",
  title: "Kanagawa Dragon (high contrast)",
  foreground: dragonPalette.dragonWhite,
  background: "#181616",
  selection: "#223249",
  palette: dragonPalette,
  terminal: [
    "#0D0C0C",
    dragonPalette.dragonRed,
    dragonPalette.dragonGreen2,
    dragonPalette.dragonYellow,
    dragonPalette.dragonBlue2,
    dragonPalette.dragonPink,
    dragonPalette.dragonAqua,
    dragonPalette.oldWhite,
    dragonPalette.dragonGray,
    dragonPalette.waveRed,
    dragonPalette.dragonGreen,
    dragonPalette.carpYellow,
    dragonPalette.springBlue,
    dragonPalette.springViolet1,
    dragonPalette.waveAqua2,
    dragonPalette.dragonWhite,
  ],
};

const light: Variant = {
  theme: "lotus",
  name: "kanagawa-lotus-hc",
  title: "Kanagawa Lotus (high contrast)",
  foreground: lotusPalette.lotusInk1,
  background: "#F2ECBC",
  selection: "#C9CBD1",
  palette: lotusPalette,
  terminal: [
    lotusPalette.lotusInk1,
    lotusPalette.lotusRed,
    lotusPalette.lotusGreen,
    lotusPalette.lotusYellow,
    lotusPalette.lotusBlue4,
    lotusPalette.lotusPink,
    lotusPalette.lotusAqua,
    lotusPalette.lotusInk1,
    lotusPalette.lotusGray3,
    lotusPalette.lotusRed2,
    lotusPalette.lotusGreen2,
    lotusPalette.lotusYellow2,
    lotusPalette.lotusTeal2,
    lotusPalette.lotusViolet4,
    lotusPalette.lotusAqua2,
    lotusPalette.lotusInk2,
  ],
};

function ghosttyTheme(variant: Variant): string {
  const palette = variant.terminal.map((color, index) => `palette = ${index}=${color}`);
  return [
    `# ${variant.title}`,
    "# Based on kanagawa from rebelot/kanagawa.nvim. Managed by theme-picker.",
    `foreground = ${variant.foreground}`,
    `background = ${variant.background}`,
    `selection-foreground = ${variant.foreground}`,
    `selection-background = ${variant.selection}`,
    `cursor-color = ${variant.foreground}`,
    `cursor-text = ${variant.background}`,
    ...palette,
    "",
  ].join("\n");
}

function luaPalette(): string {
  return Object.entries({ ...dark.palette, ...light.palette })
    .map(([name, color]) => `${name} = '${color}',`)
    .join("\n            ");
}

function luaTerminal(variant: Variant): string {
  return `${variant.theme} = { term = { ${variant.terminal.map((color) => `'${color}'`).join(", ")} } },`;
}

const ghosttyConfig = `font-thicken = true
theme = dark:${dark.name},light:${light.name}`;

const neovimColors = `-- Theme: kanagawa, high contrast (based on Kanagawa Dragon / Kanagawa Lotus from rebelot/kanagawa.nvim)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. Dark uses Dragon. Light uses Lotus.
--
-- The palette entries replace the upstream kanagawa colors with the same name. Thus all syntax,
-- diagnostic, and UI colors that use them change. The terminal colors are the Ghostty palette.
--
-- There is no OptionSet autocommand. When 'background' changes, Neovim loads g:colors_name
-- ('kanagawa') again. kanagawa keeps the setup() options, thus it loads these colors. This fires
-- ColorScheme one time.
return {
  {
    'rebelot/kanagawa.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      require('kanagawa').setup({
        background = { dark = 'dragon', light = 'lotus' },
        colors = {
          palette = {
            ${luaPalette()}
          },
          theme = {
            ${luaTerminal(dark)}
            ${luaTerminal(light)}
          },
        },
      })
      vim.cmd.colorscheme('kanagawa')
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'kanagawa' } })
    end,
  },
}`;

/**
 * The kanagawa theme with high contrast. This theme is based on Kanagawa Dragon (dark) and
 * Kanagawa Lotus (light) from rebelot/kanagawa.nvim, and applies it to Ghostty and Neovim. It does
 * not follow upstream. These are the changes:
 *
 * - Dark: the foreground is `#EAF1EA` (upstream `#C5C9C5`). The background is `#181616`, the same
 *   as upstream.
 * - Light: the foreground is `#111020` (upstream `#545464`). The background is `#F2ECBC`, the same
 *   as upstream.
 * - Each changed color keeps its OKLCH hue. Only the OKLCH lightness changes, and the chroma
 *   decreases when the color is outside sRGB. Dark colors are lighter. Light colors are darker.
 * - Syntax colors: the contrast against the background is 7:1 or more. The colors keep the
 *   upstream order of contrast and the upstream groups. Thus colors that are different upstream
 *   stay different.
 * - Comments: the contrast is 4.9:1. Comments are the dimmest syntax color. In Lotus, upstream
 *   comments are not the dimmest.
 * - Line numbers, whitespace, and deprecated text stay dimmer than comments. Their contrast
 *   increases by the same factor as comments.
 * - Diagnostic and UI text colors, and the terminal colors, also get more contrast.
 * - Neovim: the adjusted colors replace the kanagawa palette colors with the same name. The theme
 *   does not add an OptionSet autocommand. Neovim loads `kanagawa` again when 'background'
 *   changes, and this fires ColorScheme one time. Lualine uses the `kanagawa` theme, which reads
 *   the adjusted colors.
 * - Ghostty: foreground, background, cursor, selection, and palette 0 to 15 are the same as in
 *   Neovim. The Neovim terminal uses the same 16 colors. Palette 1 to 6 are the Neovim PreProc,
 *   String, Identifier, Function, Number, and Type colors. Dark palette 7 and 15, and light
 *   palette 0, have a contrast of 15:1 or more. Light palette 0 is the foreground (upstream
 *   `#1F1F28`). All palette colors that show text have a contrast of 4.5:1 or more.
 *
 * The theme writes its own Ghostty theme files, because the colors are custom.
 */
export default {
  apply() {
    return writeFileContent(path.join(ghosttyThemesDir, dark.name), ghosttyTheme(dark))
      .andThen(() => writeFileContent(path.join(ghosttyThemesDir, light.name), ghosttyTheme(light)))
      .andThen(() => applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
