import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-family = "Iosevka Custom"
font-thicken = true
font-size = 24
theme = Gruber Darker`;

const tmuxConfig = `# Gruber Darker
# Based on the Gruber Darker palette

# default statusbar colors
set-option -g status-style "fg=#95a99f,bg=#282828"

# default window title colors
set-window-option -g window-status-style "fg=#95a99f,bg=default"

# active window title colors
set-window-option -g window-status-current-style "fg=#ffdd33,bg=default"

# pane border
set-option -g pane-border-style "fg=#282828"
set-option -g pane-active-border-style "fg=#453d41"

# message text
set-option -g message-style "fg=#e4e4e4,bg=#282828"

# pane number display
set-option -g display-panes-active-colour "#73d936"
set-option -g display-panes-colour "#ffdd33"

# clock
set-window-option -g clock-mode-colour "#73d936"

# copy mode highlight
set-window-option -g mode-style "fg=#95a99f,bg=#453d41"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: tsoding (Gruber Darker)
-- Managed by theme-picker. Do not edit manually.
return {
	{
		"blazkowolf/gruber-darker.nvim",
		lazy = false,
		priority = 1000,
		config = function()
			require("gruber-darker").setup({
				bold = true,
				italic = {
					strings = true,
					comments = true,
					operators = false,
				},
			})
			vim.o.background = "dark"
			vim.cmd.colorscheme("gruber-darker")
		end,
	},
}`;

/**
 * The tsoding theme. This theme applies the Gruber Darker colors to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
