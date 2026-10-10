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

const ghosttyConfig = `font-family = "JetbrainsMono Nerd Font"
font-thicken = true
font-size = 18
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

const neovimColors = `-- Theme: tokyonight (Tokyo Night)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'folke/tokyonight.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.cmd([[colorscheme tokyonight-night]])
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'tokyonight' } })
    end,
  },
}`;

const herdrConfig = `[theme]
name = "tokyo-night"`;

/**
 * The tokyonight theme. This theme applies the Tokyo Night colors to Ghostty, tmux, Neovim, and
 * herdr.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrConfig(herdrConfigPath, herdrConfig));
  },
} satisfies ThemeModule;
