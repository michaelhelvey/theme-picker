import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = Gruber Darker`;

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
 * The tsoding theme. This theme applies the Gruber Darker colors to Ghostty and Neovim.
 */
export default {
  apply() {
    return applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig).andThen(() =>
      writeFileContent(neovimColorsPath, neovimColors),
    );
  },
} satisfies ThemeModule;
