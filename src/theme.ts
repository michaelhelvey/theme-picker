import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const BLOCK_START = ">>> theme-picker >>>";
const BLOCK_END = "<<< theme-picker <<<";

/**
 * Reports that a theme helper could not read, write, or remove a file.
 *
 * @param operation The file system operation that failed.
 * @param filePath The path of the file that the operation used.
 */
export class ThemeFileError extends Error {
  override name = "ThemeFileError";

  constructor(
    readonly operation: "read" | "write" | "remove",
    readonly filePath: string,
    options?: ErrorOptions,
  ) {
    super(`Could not ${operation} '${filePath}'`, options);
  }
}

/**
 * Describes why a theme helper could not run a command.
 *
 * - `CommandStartFailed`: the command did not start.
 * - `CommandExitFailed`: the command started and exited with a code other than zero.
 */
export type ThemeCommandError =
  | { readonly type: "CommandStartFailed"; readonly command: string; readonly cause: unknown }
  | {
      readonly type: "CommandExitFailed";
      readonly command: string;
      readonly exitCode: number;
      readonly stderr: string;
    };

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureParentDir(filePath: string): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(
    mkdir(path.dirname(filePath), { recursive: true }),
    (cause) => new ThemeFileError("write", filePath, { cause }),
  ).map(() => undefined);
}

function readFileIfExists(filePath: string): ResultAsync<string | undefined, Error> {
  return ResultAsync.fromPromise(readFile(filePath, "utf8"), (cause) => cause).orElse((cause) =>
    isNodeError(cause) && cause.code === "ENOENT"
      ? okAsync(undefined)
      : errAsync(new ThemeFileError("read", filePath, { cause })),
  );
}

/**
 * Writes content to a file through any existing symbolic link without removing the link.
 * Creates the parent directory of filePath when it is missing, but not the parent of a link target.
 *
 * @param filePath The path to write.
 * @param content The content to write.
 * @returns A result that fails when the file system refuses a write.
 */
export function writeFileContent(filePath: string, content: string): ResultAsync<void, Error> {
  return ensureParentDir(filePath).andThen(() =>
    ResultAsync.fromPromise(
      writeFile(filePath, content),
      (cause) => new ThemeFileError("write", filePath, { cause }),
    ).map(() => undefined),
  );
}

function mergeDelimitedBlock(
  existing: string | undefined,
  startMarker: string,
  endMarker: string,
  block: string,
): string {
  if (existing === undefined) {
    return `${block}\n`;
  }

  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  return pattern.test(existing)
    ? existing.replace(pattern, block)
    : `${existing.trimEnd()}\n\n${block}\n`;
}

/**
 * Writes content between theme-picker start and end markers in a config file. This helper replaces
 * an existing block, and appends a new block when the file has none.
 *
 * @param filePath The path of the config file to patch.
 * @param commentPrefix The comment prefix of the config file syntax, such as `#`.
 * @param content The content to put between the markers.
 * @returns A result that fails when the file system refuses a read or write.
 */
export function patchDelimitedBlock(
  filePath: string,
  commentPrefix: string,
  content: string,
): ResultAsync<void, Error> {
  const startMarker = `${commentPrefix} ${BLOCK_START}`;
  const endMarker = `${commentPrefix} ${BLOCK_END}`;
  const block = `${startMarker}\n${content.trimEnd()}\n${endMarker}`;

  return readFileIfExists(filePath).andThen((existing) =>
    writeFileContent(filePath, mergeDelimitedBlock(existing, startMarker, endMarker, block)),
  );
}

function spawnAndWait(command: string, args: string[]) {
  return Promise.resolve().then(async () => {
    const child = Bun.spawn([command, ...args], { stdout: "ignore", stderr: "pipe" });
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    return { exitCode, stderr: stderr.trim() };
  });
}

/**
 * Runs a command and waits for it to exit.
 *
 * @param command The name of the command to run.
 * @param args The arguments to give to the command.
 * @returns A result that fails when the command cannot start or exits with a code other than zero.
 */
export function runCommand(command: string, args: string[]): ResultAsync<void, ThemeCommandError> {
  return ResultAsync.fromPromise(spawnAndWait(command, args), (cause): ThemeCommandError => ({
    type: "CommandStartFailed",
    command,
    cause,
  })).andThen(({ exitCode, stderr }): ResultAsync<void, ThemeCommandError> =>
    exitCode === 0
      ? okAsync(undefined)
      : errAsync({ type: "CommandExitFailed", command, exitCode, stderr }),
  );
}

function describeCommandError(error: ThemeCommandError): string {
  switch (error.type) {
    case "CommandStartFailed":
      return `Could not start command '${error.command}': ${String(error.cause)}`;
    case "CommandExitFailed":
      return `Command '${error.command}' exited with code ${error.exitCode}${error.stderr === "" ? "" : `: ${error.stderr}`}`;
  }
}

/**
 * Runs a command and ignores a failure, such as when the target application is not running.
 *
 * @param command The name of the command to run.
 * @param args The arguments to give to the command.
 * @returns A result that always succeeds.
 */
export function tryRunCommand(command: string, args: string[]): ResultAsync<void, never> {
  return runCommand(command, args).orElse((error) => {
    console.warn(`Warning: ${describeCommandError(error)}`);
    return okAsync(undefined);
  });
}

const GHOSTTY_RELOAD_SCRIPT = `if application "Ghostty" is running then
  tell application "System Events" to tell process "Ghostty" to click menu item "Reload Configuration" of menu "Ghostty" of menu bar item "Ghostty" of menu bar 1
end if`;

/**
 * The Rex settings that theme-picker copies from a Ghostty config block.
 */
export interface RexSettings {
  /** The Ghostty theme names, one for each appearance in a `dark:A,light:B` value. */
  readonly themeNames: string[];
  /** The terminal font family. */
  readonly fontFamily?: string;
  /** The terminal font size in points. */
  readonly fontSize?: number;
}

/**
 * Reads the Rex settings from Ghostty config content.
 *
 * @param content The Ghostty config content.
 * @returns The theme names and font settings that the content sets.
 */
export function parseRexSettings(content: string): RexSettings {
  const values = new Map<string, string>();
  for (const line of content.split("\n")) {
    const match = /^\s*([\w-]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      values.set(match[1], match[2].replace(/^"(.*)"$/, "$1"));
    }
  }

  const themeNames = (values.get("theme") ?? "")
    .split(",")
    .map((theme) => theme.replace(/^\s*(dark|light):/, "").trim())
    .filter((theme) => theme !== "");
  const fontSize = Number(values.get("font-size"));

  return {
    themeNames,
    fontFamily: values.get("font-family"),
    fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : undefined,
  };
}

const GHOSTTY_THEME_DIRS = [
  path.join(os.homedir(), ".config", "ghostty", "themes"),
  "/Applications/Ghostty.app/Contents/Resources/ghostty/themes",
];

function findGhosttyTheme(name: string): ResultAsync<string | undefined, never> {
  const candidates = GHOSTTY_THEME_DIRS.map((dir) => path.join(dir, name));
  return ResultAsync.fromSafePromise(
    Promise.all(candidates.map((candidate) => Bun.file(candidate).exists())).then((found) =>
      candidates.find((_, index) => found[index]),
    ),
  );
}

function importRexTheme(name: string): ResultAsync<void, never> {
  return findGhosttyTheme(name).andThen((themePath) => {
    if (themePath === undefined) {
      console.warn(`Warning: Could not find the Ghostty theme '${name}' to import into Rex`);
      return okAsync(undefined);
    }

    return tryRunCommand("rex", [
      "--autostart=false",
      "do",
      "client.theme.import",
      `path=${themePath}`,
    ]);
  });
}

const REX_DEFAULTS_DOMAIN = "com.superlogical.rex";

/**
 * Applies the theme and font of Ghostty config content to Rex. Rex imports each Ghostty theme and
 * puts it in the slot for its appearance. Rex must have Remote Control on to accept the import.
 * Rex reads the font settings when it starts.
 *
 * @param content The Ghostty config content.
 * @returns A result that always succeeds. A failed step only writes a warning.
 */
export function applyRexConfig(content: string): ResultAsync<void, never> {
  const { themeNames, fontFamily, fontSize } = parseRexSettings(content);

  return themeNames
    .reduce<ResultAsync<void, never>>(
      (result, name) => result.andThen(() => importRexTheme(name)),
      okAsync(undefined),
    )
    .andThen(() =>
      fontFamily === undefined
        ? okAsync(undefined)
        : tryRunCommand("defaults", [
            "write",
            REX_DEFAULTS_DOMAIN,
            "Workspace.terminalFontName",
            "-string",
            fontFamily,
          ]),
    )
    .andThen(() =>
      fontSize === undefined
        ? okAsync(undefined)
        : tryRunCommand("defaults", [
            "write",
            REX_DEFAULTS_DOMAIN,
            "Workspace.terminalFontPointSize",
            "-float",
            String(fontSize),
          ]),
    );
}

/**
 * The terminal font that every theme uses. These lines go after the theme content. Ghostty adds
 * each `font-family` value to a fallback list, so the empty values clear the families that the
 * theme or an earlier part of the config set. For `font-size`, Ghostty and Rex use the last value.
 */
const TERMINAL_FONT = `font-family = ""
font-family-bold = ""
font-family-italic = ""
font-family-bold-italic = ""
font-family = "MonoLisaCode"
font-size = 13`;

/**
 * Applies a Ghostty config block, asks a running Ghostty to reload, and applies the same theme
 * and font to Rex. A closed Ghostty reads the config on its next start. The block always ends
 * with the shared terminal font, MonoLisaCode at 13 points.
 *
 * @example
 * applyGhosttyConfig(configPath, "font-thicken = true\ntheme = Gruber Darker");
 *
 * @param filePath The path of the Ghostty config file.
 * @param content The theme settings to put between the theme-picker markers, without a font.
 * @returns A result that fails when the file system refuses a read or write.
 */
export function applyGhosttyConfig(filePath: string, content: string): ResultAsync<void, Error> {
  const block = `${content}\n${TERMINAL_FONT}`;
  return patchDelimitedBlock(filePath, "#", block)
    .andThen(() => tryRunCommand("osascript", ["-e", GHOSTTY_RELOAD_SCRIPT]))
    .andThen(() => applyRexConfig(block));
}

function extractPlugins(content: string): Set<string> {
  const matches = content.matchAll(/@plugin\s+'([^']+)'/g);
  return new Set(
    Array.from(matches, (match) => match[1]).filter(
      (plugin): plugin is string => plugin !== undefined,
    ),
  );
}

function matchBlock(content: string, startMarker: string, endMarker: string): string {
  const pattern = new RegExp(`${escapeRegExp(startMarker)}([\\s\\S]*?)${escapeRegExp(endMarker)}`);
  return pattern.exec(content)?.[1] ?? "";
}

function isTmuxRunning(): ResultAsync<boolean, never> {
  return runCommand("tmux", ["list-sessions"])
    .map(() => true)
    .orElse(() => okAsync(false));
}

function installTmuxPlugins(): ResultAsync<void, never> {
  const binDir = path.join(os.homedir(), ".tmux", "plugins", "tpm", "bin");
  return tryRunCommand(path.join(binDir, "install_plugins"), []).andThen(() =>
    tryRunCommand(path.join(binDir, "clean_plugins"), []),
  );
}

function spawnDetached(command: string[]): void {
  const child = Bun.spawn(command, { stdout: "ignore", stderr: "ignore", detached: true });
  child.unref();
}

function reloadTmux(configPath: string, pluginsChanged: boolean): ResultAsync<void, Error> {
  return isTmuxRunning().andThen((running) => {
    if (!running) {
      console.log("tmux is not running, so the theme applies on the next start");
      return okAsync(undefined);
    }

    if (!pluginsChanged) {
      return tryRunCommand("tmux", ["source-file", configPath]);
    }

    console.log("the tmux plugin set changed, so the server restarts");
    return installTmuxPlugins().andThen(() => {
      spawnDetached(["bash", "-c", "sleep 1 && tmux kill-server"]);
      return okAsync(undefined);
    });
  });
}

/**
 * Applies a tmux config block and reloads tmux. When the plugin set changes, this helper
 * reinstalls the plugins and restarts the server, so that the old plugin options do not linger.
 *
 * @param filePath The path of the tmux config file.
 * @param content The content to put between the theme-picker markers.
 * @returns A result that fails when the file system refuses a read or write.
 */
export function applyTmuxConfig(filePath: string, content: string): ResultAsync<void, Error> {
  const startMarker = `# ${BLOCK_START}`;
  const endMarker = `# ${BLOCK_END}`;

  return readFileIfExists(filePath).andThen((existing) => {
    const oldPlugins = extractPlugins(matchBlock(existing ?? "", startMarker, endMarker));
    const newPlugins = extractPlugins(content);
    const pluginsChanged =
      oldPlugins.size !== newPlugins.size ||
      [...newPlugins].some((plugin) => !oldPlugins.has(plugin));

    return patchDelimitedBlock(filePath, "#", content).andThen(() =>
      reloadTmux(filePath, pluginsChanged),
    );
  });
}
