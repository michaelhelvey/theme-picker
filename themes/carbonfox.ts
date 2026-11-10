import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = Carbonfox`;

const tmuxConfig = `# Carbonfox
# Colors from EdenEast/nightfox.nvim extra/carbonfox/carbonfox.tmux

# default statusbar colors
set-option -g status-style "fg=#b6b8bb,bg=#0c0c0c"

# default window title colors
set-window-option -g window-status-style "fg=#7b7c7e,bg=#0c0c0c"

# active window title colors
set-window-option -g window-status-current-style "fg=#0c0c0c,bg=#b6b8bb,bold"

# pane border
set-option -g pane-border-style "fg=#b6b8bb"
set-option -g pane-active-border-style "fg=#78a9ff"

# message text
set-option -g message-style "fg=#0c0c0c,bg=#b6b8bb"

# pane number display
set-option -g display-panes-active-colour "#78a9ff"
set-option -g display-panes-colour "#b6b8bb"

# clock
set-window-option -g clock-mode-colour "#78a9ff"

# copy mode highlight
set-window-option -g mode-style "fg=#0c0c0c,bg=#b6b8bb"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: carbonfox (EdenEast/nightfox.nvim)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'EdenEast/nightfox.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.cmd.colorscheme('carbonfox')
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'carbonfox' } })
    end,
  },
}`;

/**
 * The carbonfox theme. This theme applies the Carbonfox colors from EdenEast/nightfox.nvim to
 * Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
