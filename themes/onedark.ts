import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = dark:Atom One Dark,light:Atom One Light`;

const neovimColors = `-- Theme: onedark (One Dark / One Light)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. Dark uses One Dark. Light uses One Light. If 'background' changes later, the theme loads
-- again.
return {
  {
    'navarasu/onedark.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      local function load()
        local onedark = require('onedark')
        onedark.setup({ style = vim.o.background == 'light' and 'light' or 'dark' })
        onedark.load()
        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = 'onedark' } })
        end
      end

      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'onedark' } })
    end,
  },
}`;

/**
 * The onedark theme. This theme applies the One Dark / One Light colors to Ghostty and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
