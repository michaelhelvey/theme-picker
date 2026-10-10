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
theme = dark:Night Owl,light:Night Owlish Light`;

const tmuxConfig = `set -g @plugin 'fabioluciano/tmux-powerkit'
set -g @powerkit_plugins "datetime,git"
set-option -g status-position bottom
set -g @powerkit_status_position "bottom"
set-option -g status-style bg=default
set -g @powerkit_theme "night-owl"
set -g @powerkit_theme_variant "default"
set -g @powerkit_separator_style "normal"
set -g @powerkit_edge_separator_style "normal"`;

const neovimColors = `-- Theme: mitsuhiko (Night Owl)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. Dark uses Night Owl. Light uses Light Owl. night-owl.nvim has only a dark palette, so
-- light mode writes the Light Owl colors into the palette table of the plugin before it loads the
-- colorscheme. If 'background' changes later, the theme loads again.

-- Light Owl colors for each key of the night-owl.nvim palette (lua/night-owl/palette.lua).
local light_owl = {
  fg = '#403f53',
  bg = '#fbfbfb',
  folded_bg = '#f0f0f0',
  cursor_fg = '#fbfbfb',
  cursor_bg = '#90a7b2',
  line_number_fg = '#90a7b2',
  line_number_active_fg = '#403f53',
  sign_add = '#08916a',
  sign_change = '#daaa01',
  sign_delete = '#de3d3b',
  indent_guide = '#e0e0e0',
  indent_guide_active = '#90a7b2',
  visual = '#e0e7ea',
  match_paren = '#d3e8f8',
  search_blue = '#cce4f8',
  incremental_search_blue = '#a8d4f5',
  error_red = '#de3d3b',
  word_highlight = '#e0e7ea',
  word_highlight_write = '#d6dde0',
  changed = '#4876d6',
  quickfix_line = '#e0e7ea',
  ui_border = '#90a7b2',
  ui_border2 = '#d9d9d9',
  nvim_tree_file = '#403f53',
  nvim_tree_indent_marker = '#d9d9d9',
  tab_active_bg = '#fbfbfb',
  tab_inactive_bg = '#f0f0f0',
  title = '#4876d6',
  parameter = '#403f53',
  string_delimiter = '#c96765',
  dark = '#f0f0f0',
  dark2 = '#f2f2f2',
  dark3 = '#08916a23',
  white = '#111111',
  white2 = '#222222',
  dark_white = '#5f5e72',
  gray = '#d9d9d9',
  gray2 = '#403f53',
  gray3 = '#7a8181',
  gray4 = '#403f5380',
  gray5 = '#90a7b2',
  gray6 = '#90a7b2',
  light_blue = '#0c969b',
  blue = '#4876d6',
  blue2 = '#eef3fb',
  blue3 = '#e0e7ea',
  blue4 = '#4876d633',
  blue5 = '#c9d6ef',
  blue6 = '#c9d6ef8c',
  blue7 = '#a3b6d9',
  blue8 = '#2f7ed8',
  blue9 = '#90a7b279',
  blue10 = '#697098',
  blue11 = '#4876d6',
  blue12 = '#5f7e97',
  blue13 = '#f4f6f8',
  blue14 = '#e0e0e0',
  blue15 = '#0e72c7',
  green = '#2aa298',
  green2 = '#08916a',
  light_cyan = '#0c969b',
  cyan = '#0c969b',
  cyan2 = '#0c969b',
  cyan3 = '#0c969bff',
  cyan4 = '#2aa298',
  cyan5 = '#2aa298',
  dark_cyan = '#989fb1',
  light_red = '#e64d49',
  red = '#de3d3b',
  red2 = '#d3423e',
  red3 = '#de3d3b90',
  dark_red = '#ab0300',
  light_orange = '#c96765',
  orange = '#aa0982',
  orange2 = '#c96765',
  light_yellow = '#b58900',
  yellow = '#daaa01',
  yellow2 = '#b39554',
  yellow3 = '#c99a00',
  yellow4 = '#9c6b00',
  yellow5 = '#9c6b00cc',
  light_purple = '#7e57c2',
  purple = '#994cc3',
  purple2 = '#5166f0',
  purple3 = '#994cc3',
  purple4 = '#4876d6',
  dark_purple = '#e7defa',
  magenta = '#994cc3',
  magenta2 = '#994cc3',
  magenta3 = '#7e57c2',
  magenta4 = '#d6006e',
  magenta5 = '#994cc333',
  magenta6 = '#aa098233',
}

local function lualine_theme()
  return vim.o.background == 'light' and 'auto' or 'night-owl'
end

return {
  {
    'oxfist/night-owl.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      -- setup() sets 'background' to dark. Keep the value from the terminal.
      local background = vim.o.background
      require('night-owl').setup()

      local palette = require('night-owl.palette')
      local night_owl = vim.deepcopy(palette)

      local function load()
        for key, color in pairs(night_owl) do
          palette[key] = color
        end
        if vim.o.background == 'light' then
          for key, color in pairs(light_owl) do
            palette[key] = color
          end
        end
        vim.cmd.colorscheme('night-owl')
        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = lualine_theme() } })
        end
      end

      vim.o.background = background
      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = lualine_theme() } })
    end,
  },
}`;

const herdrConfig = `[theme]
# herdr has no Night Owl theme. Use Tokyo Night as the base and set the Night Owl colors on top.
name = "tokyo-night"
auto_switch = true
light_name = "tokyo-night-day"
dark_name = "tokyo-night"

# Light Owl
[theme.custom.light]
panel_bg = "#fbfbfb"
sidebar_bg = "#f0f0f0"
active_row_bg = "#e0e7ea"
selection_bg = "#d9e2e6"
surface0 = "#f0f0f0"
surface1 = "#e0e7ea"
surface_dim = "#f6f6f6"
overlay0 = "#989fb1"
overlay1 = "#90a7b2"
text = "#403f53"
subtext0 = "#5f5e72"
accent = "#4876d6"
mauve = "#994cc3"
green = "#08916a"
yellow = "#daaa01"
red = "#de3d3b"
blue = "#4876d6"
teal = "#0c969b"
peach = "#c96765"

# Night Owl
[theme.custom.dark]
panel_bg = "#011627"
sidebar_bg = "#01111d"
active_row_bg = "#0b2942"
selection_bg = "#1d3b53"
surface0 = "#0b2942"
surface1 = "#122d42"
surface_dim = "#010d18"
overlay0 = "#4b6479"
overlay1 = "#5f7e97"
text = "#d6deeb"
subtext0 = "#a6b3c4"
accent = "#82aaff"
mauve = "#c792ea"
green = "#22da6e"
yellow = "#ffeb95"
red = "#ef5350"
blue = "#82aaff"
teal = "#7fdbca"
peach = "#f78c6c"`;

/**
 * The mitsuhiko theme. This theme applies the Night Owl colors to Ghostty, tmux, Neovim, and herdr.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrConfig(herdrConfigPath, herdrConfig));
  },
} satisfies ThemeModule;
