import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import {
  applyGhosttyConfig,
  applyHerdrConfig,
  applyTmuxConfig,
  writeFileContent,
} from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");
const herdrConfigPath = path.join(homeDir, ".config", "herdr", "config.toml");

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

const herdrConfig = `[theme]
name = "rose-pine"`;

/**
 * The beginbot-rose theme. This theme applies the Rosé Pine with transparent background colors to
 * Ghostty, tmux, Neovim, and herdr.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrConfig(herdrConfigPath, herdrConfig));
  },
} satisfies ThemeModule;
