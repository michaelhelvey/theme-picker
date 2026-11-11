import os from "node:os";
import path from "node:path";
import type { ThemeModule } from "../src/config";
import { applyGhosttyConfig, applyTmuxConfig, writeFileContent } from "../src/theme";

const homeDir = os.homedir();

const ghosttyConfigPath = path.join(homeDir, ".config", "ghostty", "config");
const ghosttyThemesDir = path.join(homeDir, ".config", "ghostty", "themes");
const ghosttyDarkThemePath = path.join(ghosttyThemesDir, "zenwritten-dark");
const ghosttyLightThemePath = path.join(ghosttyThemesDir, "zenwritten-light");
const tmuxConfigPath = path.join(homeDir, ".tmux.conf");
const neovimColorsPath = path.join(homeDir, ".config", "nvim", "lua", "custom", "colors.lua");

const ghosttyConfig = `font-thicken = true
theme = dark:zenwritten-dark,light:zenwritten-light`;

const ghosttyDarkTheme = `# Zenwritten Dark
# Colors from zenbones-theme/zenbones.nvim extras/ghostty/zenwritten_dark
foreground = #BBBBBB
background = #191919
selection-foreground = #BBBBBB
selection-background = #404040
cursor-color = #C9C9C9
cursor-text = #191919
palette = 0=#191919
palette = 8=#3D3839
palette = 1=#DE6E7C
palette = 9=#E8838F
palette = 2=#819B69
palette = 10=#8BAE68
palette = 3=#B77E64
palette = 11=#D68C67
palette = 4=#6099C0
palette = 12=#61ABDA
palette = 5=#B279A7
palette = 13=#CF86C1
palette = 6=#66A5AD
palette = 14=#65B8C1
palette = 7=#BBBBBB
palette = 15=#8E8E8E
`;

const ghosttyLightTheme = `# Zenwritten Light
# Colors from zenbones-theme/zenbones.nvim extras/ghostty/zenwritten_light
foreground = #353535
background = #EEEEEE
selection-foreground = #353535
selection-background = #D7D7D7
cursor-color = #353535
cursor-text = #EEEEEE
palette = 0=#EEEEEE
palette = 8=#C6C3C3
palette = 1=#A8334C
palette = 9=#94253E
palette = 2=#4F6C31
palette = 10=#3F5A22
palette = 3=#944927
palette = 11=#803D1C
palette = 4=#286486
palette = 12=#1D5573
palette = 5=#88507D
palette = 13=#7B3B70
palette = 6=#3B8992
palette = 14=#2B747C
palette = 7=#353535
palette = 15=#5C5C5C
`;

const tmuxConfig = `# Zenwritten Dark
# Colors from zenbones-theme/zenbones.nvim extras/tmux/zenwritten_dark.tmux

# default statusbar colors
set-option -g status-style "fg=#B279A7,bg=#BBBBBB"

# active window title colors
set-window-option -g window-status-current-style "fg=#B279A7,bg=#BBBBBB,bold"

# pane border
set-option -g pane-border-style "fg=#B279A7"
set-option -g pane-active-border-style "fg=#B279A7"

# message text
set-option -g message-style "fg=#191919,bg=#404040"

# pane number display
set-option -g display-panes-active-colour "#B279A7"
set-option -g display-panes-colour "#B279A7"

# clock
set-window-option -g clock-mode-colour "#B279A7"

# copy mode highlight
set-window-option -g mode-style "fg=#191919,bg=#404040"

set-option -g status-position bottom`;

const neovimColors = `-- Theme: zenwritten (zenbones-theme/zenbones.nvim)
-- Managed by theme-picker. Do not edit manually.
--
-- The theme follows 'background'. Before Neovim loads the config, it asks the terminal for its
-- background color (OSC 11). Ghostty follows the macOS appearance, thus 'background' is correct at
-- startup. The zenwritten colorscheme has a dark and a light variant, and it selects the variant
-- from 'background'. If 'background' changes later, the theme loads again.
return {
  {
    'zenbones-theme/zenbones.nvim',
    dependencies = 'rktjmp/lush.nvim',
    lazy = false,
    priority = 1000,
    config = function()
      local function load()
        vim.cmd.colorscheme('zenwritten')
        if package.loaded.lualine then
          require('lualine').setup({ options = { theme = 'zenwritten' } })
        end
      end

      load()
      vim.api.nvim_create_autocmd('OptionSet', { pattern = 'background', callback = load })
    end,
  },
  {
    'nvim-lualine/lualine.nvim',
    config = function()
      require('lualine').setup({ options = { theme = 'zenwritten' } })
    end,
  },
}`;

/**
 * The zenwritten theme. This theme applies the Zenwritten Dark / Zenwritten Light colors from
 * zenbones-theme/zenbones.nvim to Ghostty, tmux, and Neovim.
 */
export default {
  apply() {
    return writeFileContent(ghosttyDarkThemePath, ghosttyDarkTheme)
      .andThen(() => writeFileContent(ghosttyLightThemePath, ghosttyLightTheme))
      .andThen(() => applyGhosttyConfig(ghosttyConfigPath, ghosttyConfig))
      .andThen(() => applyTmuxConfig(tmuxConfigPath, tmuxConfig))
      .andThen(() => writeFileContent(neovimColorsPath, neovimColors));
  },
} satisfies ThemeModule;
