# theme-picker

Modify the look and feel of your terminal tools with one fell swoop.

## Motivation

I'm addicted to fiddling with my dotfiles, but when I change my color themes, it's annoying to have
to do it in ever tool that I use individually e.g. vim. tmux, my terminal emulator, etc etc. I want
a tool that applies a logical theme to _everything_ with one command.

## Getting Started

This assumes you have [Bun](https://bun.sh) installed. Clone this repository to somewhere on your
computer, then install the dependencies:

```bash
bun install
```

By default, it loads themes from the `themes` directory of this repository. Set the
`MSH_THEME_PICKER_THEMES_DIR` variable if you want to load them from somewhere else.

List the available theme names:

```bash
bun run ./src/index.ts list
```

Apply one:

```bash
bun run ./src/index.ts apply <theme-name>
```

### How themes work

Each theme is just a Typescript file that explains how to apply it. So for example,
`themes/jonhoo.ts` is a Typescript module that says how to write a particular set of neovim color
configurations to `~/.config/nvim/lua/custom/colors.lua`, and to `~/.config/ghostty/config` etc.
It's in Typescript so that you can define all sorts of weird rules if you want: some files should be
symlinked, some should be overwritten, some should be edited with some heuristic, etc.

## Add a theme

A theme is one Typescript module at `themes/<name>.ts`. The module default-exports an object with an
`apply` method that satisfies the `ThemeModule` interface. `themes/jonhoo.ts` is the reference
example, and `src/theme.ts` holds the file helpers.

To help your coding agent write a new theme, install the `theme-picker` skill:

```bash
bun run install-skill
```

This uses [`skills`](https://github.com/vercel-labs/skills) to install the skill from the local
`skills/theme-picker` directory into your agent directories. Run it again after you change the
skill. Read [`skills/theme-picker/SKILL.md`](./skills/theme-picker/SKILL.md) for the full guide.
