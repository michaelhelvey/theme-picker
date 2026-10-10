import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import {
  applyGhosttyConfig,
  applyHerdrConfig,
  applyTmuxConfig,
  writeFileContent,
} from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");
const herdrConfigPath = path.join(homeDir, ".config", "herdr", "config.toml");

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

const herdrConfig = `[theme]
# Set the Kanagawa Dragon colors on top of the herdr "kanagawa" theme for dark mode.
name = "kanagawa"
auto_switch = true
dark_name = "kanagawa"
light_name = "kanagawa-lotus"

# Kanagawa Dragon
[theme.custom.dark]
panel_bg = "#181616"
sidebar_bg = "#12120f"
active_row_bg = "#282727"
selection_bg = "#2d4f67"
surface0 = "#282727"
surface1 = "#393836"
surface_dim = "#0d0c0c"
overlay0 = "#625e5a"
overlay1 = "#737c73"
text = "#c5c9c5"
subtext0 = "#a6a69c"
accent = "#8ba4b0"
mauve = "#8992a7"
green = "#87a987"
yellow = "#c4b28a"
red = "#c4746e"
blue = "#8ba4b0"
teal = "#8ea4a2"
peach = "#b6927b"`;

/**
 * The kanagawa theme. This theme applies the Kanagawa Dragon / Kanagawa Lotus colors to Ghostty,
 * tmux, Neovim, and herdr.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrConfig(herdrConfigPath, herdrConfig));
  },
} satisfies ThemeModule;
