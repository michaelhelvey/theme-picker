import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import type { HerdrAppTheme } from "../src/theme";
import {
  applyGhosttyConfig,
  applyHerdrAppTheme,
  applyTmuxConfig,
  writeFileContent,
} from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Fira Code"
font-thicken = true
font-size = 15
background-opacity = 0.9
theme = Rose Pine`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "rose-pine"
set -g @powerkit_theme_variant "default"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

const neovimColors = `-- Theme: beginbot-rose (Rosé Pine with transparent background)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'rose-pine/neovim',
    name = 'rose-pine',
    lazy = false,
    priority = 1000,
    config = function()
      require('rose-pine').setup {
        variant = 'main',
        styles = {
          transparency = true,
        },
      }

      vim.o.background = 'dark'
      vim.cmd([[colorscheme rose-pine]])

      local transparent_groups = {
        'Normal',
        'NormalNC',
        'SignColumn',
        'EndOfBuffer',
        'LineNr',
        'FoldColumn',
        'CursorLineNr',
        'NormalFloat',
        'FloatBorder',
        'StatusLine',
        'StatusLineNC',
        'WinSeparator',
      }

      for _, group in ipairs(transparent_groups) do
        vim.api.nvim_set_hl(0, group, { bg = 'NONE' })
      end
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup {
        options = {
          theme = 'rose-pine',
          component_separators = '',
          section_separators = '',
        },
      }
    end,
  },
}`;

const herdrAppTheme = {
  dark: {
    background: "#191724",
    foreground: "#e0def4",
    selection: "#403d52",
    cursor: "#e0def4",
    ansi: [
      "#26233a",
      "#eb6f92",
      "#31748f",
      "#f6c177",
      "#9ccfd8",
      "#c4a7e7",
      "#ebbcba",
      "#e0def4",
      "#6e6a86",
      "#eb6f92",
      "#31748f",
      "#f6c177",
      "#9ccfd8",
      "#c4a7e7",
      "#ebbcba",
      "#e0def4",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The beginbot-rose theme. This theme applies the Rosé Pine with transparent background colors to
 * Ghostty, tmux, Neovim, and herdr-app.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrAppTheme(herdrAppTheme));
  },
} satisfies ThemeModule;
