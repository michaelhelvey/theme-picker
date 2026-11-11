import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = naysayer`;

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
 * The naysayer theme. This theme applies the RostislavArts/naysayer.nvim colors to Ghostty and
 * Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
