import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import type { HerdrAppTheme } from "../src/theme";
import {
  applyGhosttyConfig,
  applyHerdrAppTheme,
  applyTmuxConfig,
  writeFileContent,
} from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "MonoLisaCode"
font-thicken = true
font-size = 13
theme = dark:Atom One Dark,light:Atom One Light`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "onedark"
set -g @powerkit_theme_variant "dark"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

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

const herdrAppTheme = {
  dark: {
    background: "#21252b",
    foreground: "#abb2bf",
    selection: "#323844",
    cursor: "#abb2bf",
    ansi: [
      "#21252b",
      "#e06c75",
      "#98c379",
      "#e5c07b",
      "#61afef",
      "#c678dd",
      "#56b6c2",
      "#abb2bf",
      "#767676",
      "#e06c75",
      "#98c379",
      "#e5c07b",
      "#61afef",
      "#c678dd",
      "#56b6c2",
      "#abb2bf",
    ],
  },
  light: {
    background: "#f9f9f9",
    foreground: "#2a2c33",
    selection: "#d0dffc",
    cursor: "#bbbbbb",
    ansi: [
      "#000000",
      "#de3e35",
      "#3f953a",
      "#d2b67c",
      "#2f5af3",
      "#950095",
      "#3f953a",
      "#bbbbbb",
      "#000000",
      "#de3e35",
      "#3f953a",
      "#d2b67c",
      "#2f5af3",
      "#a00095",
      "#3f953a",
      "#ffffff",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The onedark theme. This theme applies the One Dark / One Light colors to Ghostty, tmux, Neovim,
 * and herdr-app.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrAppTheme(herdrAppTheme));
  },
} satisfies ThemeModule;
