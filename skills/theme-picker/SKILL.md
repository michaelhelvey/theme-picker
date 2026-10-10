---
name: theme-picker
description:
  Add a theme for the theme-picker CLI. Use when creating or editing themes/<name>.ts, or changing
  how a theme writes config files, or when the user asks you to "create/update a theme-picker
  theme".
---

# Add a theme to theme-picker

A theme is one TypeScript module in `themes/`. The module default-exports an object that satisfies
`ThemeModule`:

    export interface ThemeModule {
      apply(): ResultAsync<void, Error>;
    }

`apply` writes the files for one theme and returns a neverthrow `ResultAsync`. The CLI loads the
module by file name. For example, `themes/jonhoo.ts` is the theme `jonhoo`.

## Before you start

- Read `themes/jonhoo.ts`. It is the reference theme.
- Read `src/theme.ts`. It holds the file helpers.
- Read `AGENTS.md` at the repository root. It holds the repository rules.

## Step 1: Decide the files

A theme can write any file on the machine. The user of this skill may want to customize a different
set of files. Ask which files the theme owns, or read the current theme and the user's config.

For each file, decide whether the theme replaces the whole file or only a managed block inside a
shared config file. Put the content directly in the theme module as template literals. Do not add
separate content files. Check each content string for backticks and for `${`. Escape them if they
occur.

The reference theme writes the Ghostty config, the tmux config, and the Neovim `colors.lua`. Use
those files as examples, not as a fixed list.

## Step 2: Write the module

Use `os.homedir()` or another base path for the target paths. Select the helper for each file:

- `patchDelimitedBlock(path, commentPrefix, content)` replaces a `theme-picker` block in a config
  file, or appends the block when the file has none. Use it for a file that the user also edits by
  hand, such as a shell or terminal config. Set `commentPrefix` to the comment syntax of the file,
  such as `#`.
- `writeFileContent(path, content)` replaces a whole file and removes an existing symbolic link
  first. Use it for a file that the theme fully owns.
- `tryRunCommand(command, args)` runs a command and ignores a failure. Use it to reload an
  application after a write.
- `runCommand(command, args)` is the same, but it returns an error when the command fails.

Template:

    import os from "node:os";
    import path from "node:path";
    import type { ThemeModule } from "../src/config";
    import { patchDelimitedBlock, tryRunCommand, writeFileContent } from "../src/theme";

    const homeDir = os.homedir();
    const configPath = path.join(homeDir, ".config", "example", "config");
    const ownedPath = path.join(homeDir, ".config", "example", "owned.lua");

    const configBlock = `...`;
    const ownedFile = `...`;

    /**
     * The name theme. This theme applies the name colors to the configured files.
     */
    export default {
      apply() {
        return patchDelimitedBlock(configPath, "#", configBlock)
          .andThen(() => tryRunCommand("example", ["reload"]))
          .andThen(() => writeFileContent(ownedPath, ownedFile));
      },
    } satisfies ThemeModule;

Add a reload only when you need it. `tryRunCommand` prints a warning and continues when the
application is not running.

## Step 3: Check the theme

    bun run validate

Then drive the theme against a scratch copy. Do not write the user's real config files while you
test:

1. Make a scratch directory and copy the theme into it under a new name.
2. Run `MSH_THEME_PICKER_THEMES_DIR=<scratch> bun run src/index.ts apply <name>`.
3. Read back each written file.

The CLI uses `MSH_THEME_PICKER_THEMES_DIR` to select the themes directory. The default is `themes/`
at the repository root.

## Rules

- Use neverthrow for errors. Do not use `try/catch`.
- Use zod to parse unknown values instead of a cast.
- Write doc comments for the public export. Use ASD-STE100 Simplified Technical English.
- Keep one file per theme. Do not add shared content files.
- Do not assume a fixed set of target files. Write the files that the user asks for.
