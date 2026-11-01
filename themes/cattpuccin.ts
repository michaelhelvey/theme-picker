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
theme = dark:Catppuccin Mocha,light:Catppuccin Latte`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "catppuccin"
set -g @powerkit_theme_variant "mocha"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

const neovimColors = `-- Theme: cattpuccin (Catppuccin Mocha / Catppuccin Latte)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. Dark uses Catppuccin Mocha. Light uses Catppuccin Latte. If 'background' changes later,
-- the theme loads again.
return {
  {
    'catppuccin/nvim',
    name = 'catppuccin',
    lazy = false,
    priority = 1000,
    config = function()
      require('catppuccin').setup({
        flavour = 'auto',
        background = { light = 'latte', dark = 'mocha' },
      })

      local function load()
        vim.cmd.colorscheme(vim.o.background == 'light' and 'catppuccin-latte' or 'catppuccin-mocha')
        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = 'auto' } })
        end
      end

      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'auto' } })
    end,
  },
}`;

const herdrAppTheme = {
  dark: {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    selection: "#f5e0dc",
    cursor: "#f5e0dc",
    ansi: [
      "#45475a",
      "#f38ba8",
      "#a6e3a1",
      "#f9e2af",
      "#89b4fa",
      "#f5c2e7",
      "#94e2d5",
      "#bac2de",
      "#585b70",
      "#f7aec2",
      "#c2ecbf",
      "#fcd682",
      "#aeccfc",
      "#f398da",
      "#b1eae1",
      "#a6adc8",
    ],
  },
  light: {
    background: "#eff1f5",
    foreground: "#4c4f69",
    selection: "#dc8a78",
    cursor: "#dc8a78",
    ansi: [
      "#bcc0cc",
      "#d20f39",
      "#40a02b",
      "#df8e1d",
      "#1e66f5",
      "#ea76cb",
      "#179299",
      "#5c5f77",
      "#acb0be",
      "#e7103f",
      "#46b02f",
      "#e49931",
      "#3878f6",
      "#ef95d7",
      "#19a1a8",
      "#6c6f85",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The cattpuccin theme. This theme applies the Catppuccin Mocha / Catppuccin Latte colors to
 * Ghostty, tmux, Neovim, and herdr-app.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrAppTheme(herdrAppTheme));
  },
} satisfies ThemeModule;
