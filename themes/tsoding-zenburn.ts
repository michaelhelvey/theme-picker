import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Ubuntu Mono"
font-thicken = true
font-size = 26
adjust-cell-width = "6%"
theme = Zenburn`;

const tmuxConfig = `# Zenburn
# Based on the Zenburn palette

# default statusbar colors
set-option -g status-style "fg=#dcdccc,bg=#3f3f3f"

# default window title colors
set-window-option -g window-status-style "fg=#8cd0d3,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#f0dfaf,bg=default"

# pane border
set-option -g pane-border-style "fg=#4d4d4d"
set-option -g pane-active-border-style "fg=#709080"

# message text
set-option -g message-style "fg=#dcdccc,bg=#3f3f3f"

# pane number display
set-option -g display-panes-active-colour "#60b48a"
set-option -g display-panes-colour "#f0dfaf"

# clock
set-window-option -g clock-mode-colour "#60b48a"

# copy mode highlight
set-window-option -g mode-style "fg=#dcdccc,bg=#21322f"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: tsoding-zenburn (Zenburn)
-- Managed by theme-picker. Do not edit manually.
return {
	{
		"phha/zenburn.nvim",
		lazy = false,
		priority = 1000,
		config = function()
			vim.o.background = "dark"
			vim.cmd.colorscheme("zenburn")
		end,
	},
	{
		"nvim-lualine/lualine.nvim",
		lazy = false,
		opts = {
			options = {
				theme = "zenburn",
			},
		},
	},
}`;

/**
 * The tsoding-zenburn theme. This theme applies the Zenburn colors to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
