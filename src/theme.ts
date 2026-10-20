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
  | { readonly type: "CommandExitFailed"; readonly command: string; readonly exitCode: number };

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

function spawnAndWait(command: string, args: string[]): Promise<number> {
  return Promise.resolve().then(() => {
    const child = Bun.spawn([command, ...args], { stdout: "ignore", stderr: "ignore" });
    return child.exited;
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
  })).andThen((exitCode): ResultAsync<void, ThemeCommandError> =>
    exitCode === 0
      ? okAsync(undefined)
      : errAsync({ type: "CommandExitFailed", command, exitCode }),
  );
}

function describeCommandError(error: ThemeCommandError): string {
  switch (error.type) {
    case "CommandStartFailed":
      return `Could not start command '${error.command}'`;
    case "CommandExitFailed":
      return `Command '${error.command}' exited with code ${error.exitCode}`;
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

const GHOSTTY_RELOAD_SCRIPT =
  'tell application "System Events" to tell process "Ghostty" to click menu item "Reload ' +
  'Configuration" of menu "Ghostty" of menu bar item "Ghostty" of menu bar 1';

/**
 * Applies a Ghostty config block and asks Ghostty to reload.
 *
 * @param filePath The path of the Ghostty config file.
 * @param content The content to put between the theme-picker markers.
 * @returns A result that fails when the file system refuses a read or write.
 */
export function applyGhosttyConfig(filePath: string, content: string): ResultAsync<void, Error> {
  return patchDelimitedBlock(filePath, "#", content).andThen(() =>
    tryRunCommand("osascript", ["-e", GHOSTTY_RELOAD_SCRIPT]),
  );
}

/**
 * Applies a herdr config block and asks herdr to reload.
 *
 * @param filePath The path of the herdr config file.
 * @param content The content to put between the theme-picker markers.
 * @returns A result that fails when the file system refuses a read or write.
 */
export function applyHerdrConfig(filePath: string, content: string): ResultAsync<void, Error> {
  return patchDelimitedBlock(filePath, "#", content).andThen(() =>
    tryRunCommand("herdr", ["server", "reload-config"]),
  );
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
