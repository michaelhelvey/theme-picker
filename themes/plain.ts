import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Berkeley Mono"
font-size = 18
theme = plain`;

const tmuxConfig = `# Plain black and white
# Managed by theme-picker. Do not edit manually.

# default statusbar colors
set-option -g status-style "fg=#ffffff,bg=#000000"

# default window title colors
set-window-option -g window-status-style "fg=#ffffff,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#000000,bg=#ffffff"

# pane border
set-option -g pane-border-style "fg=#ffffff"
set-option -g pane-active-border-style "fg=#ffffff"

# message text
set-option -g message-style "fg=#000000,bg=#ffffff"

# pane number display
set-option -g display-panes-active-colour "#ffffff"
set-option -g display-panes-colour "#ffffff"

# clock
set-window-option -g clock-mode-colour "#ffffff"

# copy mode highlight
set-window-option -g mode-style "fg=#000000,bg=#ffffff"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: plain (Pure black and white)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    dir = '.',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.o.showmode = true
      vim.o.laststatus = 2
      vim.cmd([[highlight clear]])
      vim.cmd([[set termguicolors]])

      local hi = vim.api.nvim_set_hl
      local bw = {
        Normal = { fg = '#ffffff', bg = '#000000' },
        NormalFloat = { fg = '#ffffff', bg = '#000000' },
        FloatBorder = { fg = '#ffffff', bg = '#000000' },
        Comment = { fg = '#ffffff', italic = true },
        Visual = { fg = '#000000', bg = '#ffffff' },
        CursorLine = { bg = '#000000' },
        CursorLineNr = { fg = '#ffffff', bold = true },
        LineNr = { fg = '#ffffff' },
        SignColumn = { bg = '#000000' },
        StatusLine = { fg = '#000000', bg = '#ffffff' },
        StatusLineNC = { fg = '#ffffff', bg = '#000000' },
        VertSplit = { fg = '#ffffff' },
        WinSeparator = { fg = '#ffffff' },
        Pmenu = { fg = '#ffffff', bg = '#000000' },
        PmenuSel = { fg = '#000000', bg = '#ffffff' },
        Search = { fg = '#000000', bg = '#ffffff' },
        IncSearch = { fg = '#000000', bg = '#ffffff' },
        CurSearch = { fg = '#000000', bg = '#ffffff' },
        MatchParen = { fg = '#000000', bg = '#ffffff' },
        TabLine = { fg = '#ffffff', bg = '#000000' },
        TabLineSel = { fg = '#000000', bg = '#ffffff' },
        TabLineFill = { bg = '#000000' },
        Directory = { fg = '#ffffff' },
        Title = { fg = '#ffffff', bold = true },
        NonText = { fg = '#ffffff' },
        SpecialKey = { fg = '#ffffff' },
        Folded = { fg = '#ffffff', bg = '#000000' },
        FoldColumn = { fg = '#ffffff', bg = '#000000' },
        DiffAdd = { fg = '#ffffff', bold = true },
        DiffChange = { fg = '#ffffff' },
        DiffDelete = { fg = '#ffffff' },
        DiffText = { fg = '#000000', bg = '#ffffff' },
        ErrorMsg = { fg = '#ffffff', bold = true },
        WarningMsg = { fg = '#ffffff', bold = true },
        ModeMsg = { fg = '#ffffff' },
        MoreMsg = { fg = '#ffffff' },
        Question = { fg = '#ffffff' },
        WildMenu = { fg = '#000000', bg = '#ffffff' },
        SpellBad = { undercurl = true, sp = '#ffffff' },
        SpellCap = { undercurl = true, sp = '#ffffff' },
        DiagnosticError = { fg = '#ffffff', bold = true },
        DiagnosticWarn = { fg = '#ffffff' },
        DiagnosticInfo = { fg = '#ffffff' },
        DiagnosticHint = { fg = '#ffffff' },
        -- Syntax
        String = { fg = '#ffffff' },
        Function = { fg = '#ffffff', bold = true },
        Keyword = { fg = '#ffffff', bold = true },
        Type = { fg = '#ffffff' },
        Identifier = { fg = '#ffffff' },
        Statement = { fg = '#ffffff', bold = true },
        PreProc = { fg = '#ffffff' },
        Constant = { fg = '#ffffff' },
        Special = { fg = '#ffffff' },
        Delimiter = { fg = '#ffffff' },
        Operator = { fg = '#ffffff' },
        -- Treesitter
        ['@variable'] = { fg = '#ffffff' },
        ['@function'] = { fg = '#ffffff', bold = true },
        ['@keyword'] = { fg = '#ffffff', bold = true },
        ['@string'] = { fg = '#ffffff' },
        ['@type'] = { fg = '#ffffff' },
        ['@comment'] = { fg = '#ffffff', italic = true },
        ['@constant'] = { fg = '#ffffff' },
        ['@number'] = { fg = '#ffffff' },
        ['@operator'] = { fg = '#ffffff' },
        ['@punctuation'] = { fg = '#ffffff' },
      }
      for group, opts in pairs(bw) do
        hi(0, group, opts)
      end
    end,
  },
}`;

/**
 * The plain theme. This theme applies the Pure black and white colors to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
