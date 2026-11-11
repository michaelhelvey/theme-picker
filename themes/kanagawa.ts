import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = dark:Kanagawa Dragon,light:Kanagawa Lotus`;

const neovimColors = `-- Theme: kanagawa (Kanagawa Dragon / Kanagawa Lotus)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. Dark uses Dragon. Light uses Lotus. If 'background' changes later, the theme loads again.
return {
  {
    'rebelot/kanagawa.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      require('kanagawa').setup({
        background = { dark = 'dragon', light = 'lotus' },
      })

      local function load()
        vim.cmd.colorscheme('kanagawa')
        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = 'kanagawa' } })
        end
      end

      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'kanagawa' } })
    end,
  },
}`;

/**
 * The kanagawa theme. This theme applies the Kanagawa Dragon / Kanagawa Lotus colors to Ghostty
 * and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
