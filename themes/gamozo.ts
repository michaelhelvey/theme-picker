import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "NotoSansM Nerd Font"
font-thicken = true
font-size = 18
theme = plain`;

const tmuxConfig = `# No tmux theme overrides for gamozo.
# Managed by theme-picker. Do not edit manually.`;

const neovimColors = `-- Theme: gamozo (Retro ANSI-on-black based on torte with amber comments)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    dir = '.',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.o.termguicolors = true
      vim.cmd([[colorscheme torte]])

      local hi = vim.api.nvim_set_hl
      hi(0, 'Comment', { fg = '#d7af5f' })
      hi(0, '@comment', { link = 'Comment' })
    end,
  },
}`;

/**
 * The gamozo theme. This theme applies the Retro ANSI-on-black based on torte with amber comments
 * colors to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
