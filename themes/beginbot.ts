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
theme = TokyoNight Night`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "tokyonight"
set -g @powerkit_theme_variant "night"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

const neovimColors = `-- Theme: beginbot (Tokyo Night with transparent background)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'folke/tokyonight.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      require('tokyonight').setup {
        style = 'night',
        transparent = true,
      }

      vim.o.background = 'dark'
      vim.cmd([[colorscheme tokyonight-night]])

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
          theme = 'tokyonight',
          component_separators = '',
          section_separators = '',
        },
      }
    end,
  },
}`;

const herdrAppTheme = {
  dark: {
    background: "#1a1b26",
    foreground: "#c0caf5",
    selection: "#283457",
    cursor: "#c0caf5",
    ansi: [
      "#15161e",
      "#f7768e",
      "#9ece6a",
      "#e0af68",
      "#7aa2f7",
      "#bb9af7",
      "#7dcfff",
      "#a9b1d6",
      "#414868",
      "#f7768e",
      "#9ece6a",
      "#e0af68",
      "#7aa2f7",
      "#bb9af7",
      "#7dcfff",
      "#c0caf5",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The beginbot theme. This theme applies the Tokyo Night with transparent background colors to
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
