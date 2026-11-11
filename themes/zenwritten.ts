import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const ghosttyThemesDir = path.join(homeDir, ".config", "ghostty", "themes");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

interface Variant {
  name: string;
  title: string;
  foreground: string;
  background: string;
  cursor: string;
  selection: string;
  palette: readonly string[];
}

const dark: Variant = {
  name: "zenwritten-dark",
  title: "Zenwritten Dark (high contrast)",
  foreground: "#EEEEEE",
  background: "#131313",
  cursor: "#F1F1F1",
  selection: "#393939",
  palette: [
    "#131313",
    "#DE6E7C",
    "#819B69",
    "#B77E64",
    "#6099C0",
    "#B279A7",
    "#66A5AD",
    "#EEEEEE",
    "#8B8B8B",
    "#E8838F",
    "#8BAE68",
    "#D68C67",
    "#61ABDA",
    "#CF86C1",
    "#65B8C1",
    "#FFFFFF",
  ],
};

const light: Variant = {
  name: "zenwritten-light",
  title: "Zenwritten Light (high contrast)",
  foreground: "#111111",
  background: "#F6F6F6",
  cursor: "#111111",
  selection: "#DFDFDF",
  palette: [
    "#111111",
    "#A8334C",
    "#4F6C31",
    "#944927",
    "#286486",
    "#88507D",
    "#2F7983",
    "#353535",
    "#666666",
    "#94253E",
    "#3F5A22",
    "#803D1C",
    "#1D5573",
    "#7B3B70",
    "#2B747C",
    "#5C5C5C",
  ],
};

function ghosttyTheme(variant: Variant): string {
  const palette = variant.palette.map((color, index) => `palette = ${index}=${color}`);
  return [
    `# ${variant.title}`,
    "# Based on zenwritten from zenbones-theme/zenbones.nvim. Managed by theme-picker.",
    `foreground = ${variant.foreground}`,
    `background = ${variant.background}`,
    `selection-foreground = ${variant.foreground}`,
    `selection-background = ${variant.selection}`,
    `cursor-color = ${variant.cursor}`,
    `cursor-text = ${variant.background}`,
    ...palette,
    "",
  ].join("\n");
}

function luaVariant(variant: Variant, options: string): string {
  const terminal = variant.palette.map((color) => `'${color}'`).join(", ");
  return `{
    fg = '${variant.foreground}',
    bg = '${variant.background}',
    options = ${options},
    terminal = { ${terminal} },
  }`;
}

const ghosttyConfig = `font-thicken = true
theme = dark:${dark.name},light:${light.name}`;

const neovimColors = `-- Theme: zenwritten, high contrast (based on zenbones-theme/zenbones.nvim)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. If 'background' changes later, the theme loads again.
--
-- The name is 'zenwritten-hc', not 'zenwritten'. When 'background' changes, Neovim loads the
-- colorscheme with the name in g:colors_name again. With 'zenwritten', Neovim loads the upstream
-- colors first.
--
-- The colors come from the zenbones generator with a custom fg and bg ("Create your own
-- colorscheme" in the zenbones documentation). The accent colors come from the terminal colors.
-- All other colors derive from these colors.
-- zenbones makes Type and Delimiter from bg, thus they do not get the higher contrast of fg. The
-- overrides put them back between the same neighbors as upstream.
local variants = {
  dark = ${luaVariant(dark, "{ lighten_comments = 55, lighten_line_nr = 45 }")},
  light = ${luaVariant(light, "{ darken_comments = 56, darken_line_nr = 45 }")},
}

return {
  {
    'zenbones-theme/zenbones.nvim',
    dependencies = 'rktjmp/lush.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      local lush = require('lush')
      local generator = require('zenbones.specs')
      local util = require('zenbones.util')

      local function load()
        local background = vim.o.background
        local variant = variants[background]
        local colors = { bg = lush.hsluv(variant.bg), fg = lush.hsluv(variant.fg) }
        for index, name in ipairs({ 'rose', 'leaf', 'wood', 'water', 'blossom', 'sky' }) do
          colors[name] = lush.hsluv(variant.terminal[index + 1])
          colors[name .. '1'] = lush.hsluv(variant.terminal[index + 9])
        end
        local palette = util.palette_extend(colors, background)

        local base = generator.generate(palette, background, variant.options)
        local specs = lush.extends({ base }).with(function()
          return {
            Type { fg = base.Type.fg.lightness((base.Identifier.fg.l + base.Special.fg.l) / 2) },
            Delimiter { fg = base.Delimiter.fg.lightness((base.Constant.fg.l + base.Comment.fg.l) / 2) },
          }
        end)

        vim.g.colors_name = 'zenwritten-hc'
        lush(specs)
        for index, color in ipairs(variant.terminal) do
          vim.g['terminal_color_' .. (index - 1)] = color
        end
        vim.api.nvim_exec_autocmds('ColorScheme', { pattern = 'zenwritten-hc' })

        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = 'auto' } })
        end
      end

      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'auto' } })
    end,
  },
}`;

/**
 * The zenwritten theme with high contrast. This theme is based on Zenwritten Dark / Zenwritten
 * Light from zenbones-theme/zenbones.nvim, and applies it to Ghostty and Neovim. It does not
 * follow upstream. These are the changes:
 *
 * - Dark: the foreground is `#EEEEEE` (upstream `#BBBBBB`). The background is `#131313` (upstream
 *   `#191919`).
 * - Light: the foreground is `#111111` (upstream `#353535`). The background is `#F6F6F6`
 *   (upstream `#EEEEEE`).
 * - The backgrounds have the lightness of the zenbones `darkness = "stark"` and
 *   `lightness = "bright"` options, but they are gray. These options add a red tint.
 * - Neovim: the zenbones generator makes all syntax shades from the new foreground and background.
 *   Comments and line numbers are more different from the background (dark: `lighten_comments =
 *   55`, `lighten_line_nr = 45`; light: `darken_comments = 56`, `darken_line_nr = 45`). Lualine
 *   uses the `auto` theme, because the zenwritten lualine themes have the upstream colors.
 * - Neovim: Type and Delimiter get the same order of contrast as upstream. Type is between
 *   Identifier and Special. Delimiter is between Constant and Comment.
 * - Ghostty: foreground, background, cursor, and selection are the same as in Neovim. Dark palette
 *   7 is the foreground, 8 is the comment color, and 15 is `#FFFFFF`. Light palette 0 is the
 *   foreground, 6 is `#2F7983` (upstream `#3B8992`), and 8 is the comment color. The Neovim
 *   terminal uses the same 16 colors. All palette colors that show text have a contrast of 4.5:1
 *   or more.
 * - Neovim: the accent colors (red, green, yellow, blue, magenta, and cyan) are palette 1 to 6 and
 *   9 to 14. Only light cyan is different from upstream.
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
