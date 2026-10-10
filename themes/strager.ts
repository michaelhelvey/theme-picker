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

const ghosttyConfig = `font-family = "ComicCodeLigatures Nerd Font"
font-thicken = true
font-size = 18
theme = solarized-strager`;

const tmuxConfig = `# Solarized Dark (strager high-contrast variant) - tmux colors
# statusbar colors
set-option -g status-style "fg=#b0c4c6,bg=#002b36"
# window title colors
set-window-option -g window-status-style "fg=#7a9299,bg=default"
# active window title colors
set-window-option -g window-status-current-style "fg=#b58900,bg=default"
# pane border
set-option -g pane-border-style "fg=#073642"
set-option -g pane-active-border-style "fg=#7a9299"
# message text
set-option -g message-style "fg=#b0c4c6,bg=#002b36"
set-option -g status-position bottom`;

const neovimColors = `-- Theme: strager (Dark blue-gray background, multi-color syntax)
-- Managed by theme-picker. Do not edit manually.
return {
	{
		"maxmx03/solarized.nvim",
		lazy = false,
		priority = 1000,
		config = function()
			vim.o.background = "dark"
			require("solarized").setup({
				variant = "autumn",
				on_colors = function(colors, _color)
					-- Match Ghostty background/foreground exactly
					colors.base03 = "#061822" -- main bg
					colors.base04 = "#061822" -- darker bg for floats/sidebars
					colors.base02 = "#003340" -- cursorline/selection bg
					colors.base0 = "#c8c8c8" -- main foreground
					colors.base00 = "#8a8a8a" -- secondary text
					colors.base01 = "#6a7a7a" -- comments
					colors.base1 = "#e0e0e0" -- emphasized content
					return colors
				end,
			})
			vim.cmd([[colorscheme solarized]])
		end,
	},
}`;

const herdrConfig = `[theme]
name = "solarized"`;

/**
 * The strager theme. This theme applies the Dark blue-gray background, multi-color syntax colors to
 * Ghostty, tmux, Neovim, and herdr.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig)
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors))
      .andThen(() => applyHerdrConfig(herdrConfigPath, herdrConfig));
  },
} satisfies ThemeModule;
