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
theme = dark:Kanagawa Dragon,light:Kanagawa Lotus`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "kanagawa"
set -g @powerkit_theme_variant "dragon"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

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

const herdrAppTheme = {
  dark: {
    background: "#181616",
    foreground: "#c5c9c5",
    selection: "#c5c9c5",
    cursor: "#c8c093",
    ansi: [
      "#0d0c0c",
      "#c4746e",
      "#8a9a7b",
      "#c4b28a",
      "#8ba4b0",
      "#a292a3",
      "#8ea4a2",
      "#c8c093",
      "#a6a69c",
      "#e46876",
      "#87a987",
      "#e6c384",
      "#7fb4ca",
      "#938aa9",
      "#7aa89f",
      "#c5c9c5",
    ],
  },
  light: {
    background: "#f2ecbc",
    foreground: "#545464",
    selection: "#545464",
    cursor: "#43436c",
    ansi: [
      "#1f1f28",
      "#c84053",
      "#6f894e",
      "#77713f",
      "#4d699b",
      "#b35b79",
      "#597b75",
      "#545464",
      "#8a8980",
      "#d7474b",
      "#6e915f",
      "#836f4a",
      "#6693bf",
      "#624c83",
      "#5e857a",
      "#43436c",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The kanagawa theme. This theme applies the Kanagawa Dragon / Kanagawa Lotus colors to Ghostty,
 * tmux, Neovim, and herdr-app.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrAppTheme(herdrAppTheme));
  },
} satisfies ThemeModule;
