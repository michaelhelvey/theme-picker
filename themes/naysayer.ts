import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Ubuntu Mono"
font-thicken = true
font-size = 26
theme = naysayer`;

const tmuxConfig = `# Naysayer-inspired tmux theme
# Based on RostislavArts/naysayer.nvim palette

# statusbar colors
set-option -g status-style "fg=#d0b892,bg=#062625"

# window title colors
set-window-option -g window-status-style "fg=#53d549,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#3ad0b5,bg=default"

# pane border
set-option -g pane-border-style "fg=#126367"
set-option -g pane-active-border-style "fg=#8cde94"

# message text
set-option -g message-style "fg=#d0b892,bg=#062625"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: naysayer (RostislavArts/naysayer.nvim)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'RostislavArts/naysayer.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.cmd([[colorscheme naysayer]])

      -- Naysayer is intended to be used without treesitter highlights.
      pcall(vim.cmd, 'TSDisable highlight')

      for _, buf in ipairs(vim.api.nvim_list_bufs()) do
        pcall(vim.treesitter.stop, buf)
      end

      vim.api.nvim_create_autocmd({ 'BufEnter', 'FileType' }, {
        group = vim.api.nvim_create_augroup('NaysayerDisableTreesitter', { clear = true }),
        callback = function(args)
          pcall(vim.treesitter.stop, args.buf)
        end,
      })
    end,
  },
}`;

/**
 * The naysayer theme. This theme applies the RostislavArts/naysayer.nvim colors to Ghostty, tmux,
 * and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
