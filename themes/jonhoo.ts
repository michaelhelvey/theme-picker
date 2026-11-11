import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = jonhoo`;

const neovimColors = `-- Theme: jonhoo (Gruvbox Dark Hard)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'wincent/base16-nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.cmd([[colorscheme base16-gruvbox-dark-hard]])
      vim.o.background = 'dark'
      vim.cmd([[hi Normal ctermbg=NONE]])
    end,
  },
  {
    'itchyny/lightline.vim',
    lazy = false,
    config = function()
      vim.o.showmode = false
      vim.g.lightline = {
        active = {
          left = {
            { 'mode',     'paste' },
            { 'readonly', 'filename', 'modified' },
          },
          right = {
            { 'lineinfo' },
            { 'percent' },
            { 'fileencoding', 'filetype' },
          },
        },
        component_function = {
          filename = 'LightlineFilename',
        },
      }
      function LightlineFilenameInLua(opts)
        if vim.fn.expand('%:t') == '' then
          return '[No Name]'
        else
          return vim.fn.getreg('%')
        end
      end

      -- https://github.com/itchyny/lightline.vim/issues/657
      vim.api.nvim_exec(
        [[
        function! g:LightlineFilename()
            return v:lua.LightlineFilenameInLua()
        endfunction
        ]],
        true
      )
    end,
  },
}`;

/**
 * The jonhoo theme. This theme applies the Gruvbox Dark Hard colors to Ghostty and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
