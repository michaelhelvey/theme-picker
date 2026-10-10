import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Hack Nerd Font"
font-thicken = true
font-size = 15
theme = Tomorrow Night Eighties
adjust-cell-width = "5%"`;

const tmuxConfig = `# tmux defaults
# Managed by theme-picker. Do not edit manually.`;

const neovimColors = `-- Theme: sphaero (base16-tomorrow-night-eighties)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'RRethy/base16-nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.cmd([[colorscheme base16-tomorrow-night-eighties]])
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
 * The sphaero theme. This theme applies the base16-tomorrow-night-eighties colors to Ghostty, tmux,
 * and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
