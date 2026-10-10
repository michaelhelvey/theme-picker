import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "NotoSansM Nerd Font"
font-thicken = true
font-size = 18
theme = jonhoo
font-style-italic = false
font-style-bold = false`;

const tmuxConfig = `# Base16 Gruvbox dark, hard
# Scheme author: Dawid Kurek (dawikur@gmail.com), morhetz (https://github.com/morhetz/gruvbox)
# Template author: Tinted Theming: (https://github.com/tinted-theming)

# default statusbar colors
set-option -g status-style "fg=#bdae93,bg=#3c3836"

# default window title colors
set-window-option -g window-status-style "fg=#bdae93,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#fabd2f,bg=default"

# pane border
set-option -g pane-border-style "fg=#3c3836"
set-option -g pane-active-border-style "fg=#504945"

# message text
set-option -g message-style "fg=#d5c4a1,bg=#3c3836"

# pane number display
set-option -g display-panes-active-colour "#b8bb26"
set-option -g display-panes-colour "#fabd2f"

# clock
set-window-option -g clock-mode-colour "#b8bb26"

# copy mode highlight
set-window-option -g mode-style "fg=#bdae93,bg=#504945"

set-option -g status-position bottom`;

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
 * The jonhoo theme. This theme applies the Gruvbox Dark Hard colors to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
