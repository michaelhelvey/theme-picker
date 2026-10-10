import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import untildify from "untildify";
import { z } from "zod";

function getDefaultThemesDir() {
  return path.join(import.meta.dirname, "..", "themes");
}

/**
 * Gets the directory we should load themes from, based on either `MSH_THEME_PICKER_THEMES_DIR` or
 * the default (`themes` at the root of this repository).
 *
 * @returns The directory where themes are stored, where each theme is a typescript file
 * corresponding to the name of the theme.
 */
export function getThemesDir(customDir = process.env.MSH_THEME_PICKER_THEMES_DIR) {
  return customDir ? untildify(customDir) : getDefaultThemesDir();
}

/**
 * Describes why theme enumeration failed.
 *
 * - `ThemesDirNotFound`: the themes directory does not exist.
 * - `ThemesDirReadFailed`: the themes directory exists, but the file system refused a read.
 * - `ThemeNotFound`: a requested theme is not in the themes directory.
 */
export type EnumerateThemesError =
  | { type: "ThemesDirNotFound"; readonly dir: string }
  | { type: "ThemesDirReadFailed"; readonly dir: string; readonly cause: unknown }
  | { type: "ThemeNotFound"; readonly theme: string };

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function toEnumerateThemesError(dir: string, error: unknown): EnumerateThemesError {
  if (isNodeError(error) && error.code === "ENOENT") {
    return { type: "ThemesDirNotFound", dir };
  }

  return { type: "ThemesDirReadFailed", dir, cause: error };
}

function isTypescriptFile(entry: Dirent): boolean {
  return entry.isFile() && entry.name.endsWith(".ts");
}

function toThemeName(entry: Dirent): string {
  return path.basename(entry.name, ".ts");
}

/**
 * Lists the theme names in a directory. Each theme is a TypeScript file. The names are the file
 * names without the `.ts` extension.
 *
 * @param dir The directory that holds the theme files.
 * @returns The sorted theme names, or an error when the directory is missing or cannot be read.
 */
export function enumerateThemes(dir: string): ResultAsync<string[], EnumerateThemesError> {
  const entries = ResultAsync.fromPromise(readdir(dir, { withFileTypes: true }), (error) => error);

  return entries
    .mapErr((error) => toEnumerateThemesError(dir, error))
    .map((dirents) => dirents.filter(isTypescriptFile).map(toThemeName).sort());
}

export interface ThemeModule {
  apply(): ResultAsync<void, Error>;
}

/**
 * Describes why loading a theme module failed.
 *
 * - `ThemesDirNotFound`, `ThemesDirReadFailed`, and `ThemeNotFound`: see `EnumerateThemesError`.
 * - `ThemeLoadFailed`: the theme file exists, but its module cannot be imported.
 * - `ThemeModuleInvalid`: the module does not have a default export that satisfies `ThemeModule`.
 */
export type LoadThemeError =
  | EnumerateThemesError
  | { readonly type: "ThemeLoadFailed"; readonly theme: string; readonly cause: unknown }
  | { readonly type: "ThemeModuleInvalid"; readonly theme: string };

const themeModuleSchema = z.object({
  default: z.object({
    apply: z.custom<ThemeModule["apply"]>((value) => typeof value === "function"),
  }),
});

function getThemeUrl(dir: string, theme: string): string {
  return pathToFileURL(path.resolve(dir, `${theme}.ts`)).href;
}

function importThemeModule(url: string): Promise<unknown> {
  return Promise.resolve().then(async () => {
    const module: unknown = await import(url);
    return module;
  });
}

/**
 * Loads a theme module from the themes directory.
 *
 * @param dir The directory that holds the theme files.
 * @param theme The name of the theme to load, without the `.ts` extension.
 * @returns The loaded theme module, or an error when the theme is missing, its module cannot be
 * imported, or the module does not satisfy the `ThemeModule` interface.
 */
export function loadTheme(dir: string, theme: string): ResultAsync<ThemeModule, LoadThemeError> {
  return enumerateThemes(dir)
    .andThen((themes) =>
      themes.includes(theme)
        ? okAsync(theme)
        : errAsync<string, LoadThemeError>({ type: "ThemeNotFound", theme }),
    )
    .andThen((name) =>
      ResultAsync.fromPromise(
        importThemeModule(getThemeUrl(dir, name)),
        (cause): LoadThemeError => ({
          type: "ThemeLoadFailed",
          theme: name,
          cause,
        }),
      ),
    )
    .andThen((module) => {
      const parsed = themeModuleSchema.safeParse(module);
      return parsed.success
        ? okAsync(parsed.data.default)
        : errAsync<ThemeModule, LoadThemeError>({ type: "ThemeModuleInvalid", theme });
    });
}
