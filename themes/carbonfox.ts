import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = Carbonfox`;

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
 * Ghostty and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
