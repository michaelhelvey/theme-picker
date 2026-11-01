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

const ghosttyConfig = `font-family = "Ubuntu Mono"
font-thicken = true
font-size = 26
theme = naysayer`;

const tmuxConfig = `# Naysayer-inspired tmux theme
# Based on RostislavArts/naysayer.nvim palette

# statusbar colors
set-option -g status-style "fg=#d0b892,bg=#062625"

# window title colors
set-window-option -g window-status-style "fg=#53d549,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#3ad0b5,bg=default"

# pane border
set-option -g pane-border-style "fg=#126367"
set-option -g pane-active-border-style "fg=#8cde94"

# message text
set-option -g message-style "fg=#d0b892,bg=#062625"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: naysayer (RostislavArts/naysayer.nvim)
-- Managed by theme-picker. Do not edit manually.
return {
  {
    'RostislavArts/naysayer.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      vim.o.background = 'dark'
      vim.cmd([[colorscheme naysayer]])

      -- Naysayer is intended to be used without treesitter highlights.
      pcall(vim.cmd, 'TSDisable highlight')

      for _, buf in ipairs(vim.api.nvim_list_bufs()) do
        pcall(vim.treesitter.stop, buf)
      end

      vim.api.nvim_create_autocmd({ 'BufEnter', 'FileType' }, {
        group = vim.api.nvim_create_augroup('NaysayerDisableTreesitter', { clear = true }),
        callback = function(args)
          pcall(vim.treesitter.stop, args.buf)
        end,
      })
    end,
  },
}`;

const herdrAppTheme = {
  dark: {
    background: "#062625",
    foreground: "#d0b892",
    selection: "#0000ff",
    cursor: "#ffffff",
    ansi: [
      "#041b1a",
      "#f92672",
      "#a6e22e",
      "#e6db74",
      "#66d9ef",
      "#fd5ff0",
      "#87ffde",
      "#d0b892",
      "#126367",
      "#ff5f87",
      "#b8f26b",
      "#fff394",
      "#8be9ff",
      "#ff86f7",
      "#a1efe4",
      "#ffffff",
    ],
  },
} satisfies HerdrAppTheme;

/**
 * The naysayer theme. This theme applies the RostislavArts/naysayer.nvim colors to Ghostty, tmux,
 * Neovim, and herdr-app.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrAppTheme(herdrAppTheme));
  },
} satisfies ThemeModule;
