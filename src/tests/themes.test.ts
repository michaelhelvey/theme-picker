import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { enumerateThemes } from "../config";

const repoRoot = path.join(import.meta.dirname, "..", "..");
const themesDir = path.join(repoRoot, "themes");
const cliEntry = path.join(repoRoot, "src", "index.ts");
const ghosttyBinary = "/Applications/Ghostty.app/Contents/MacOS/ghostty";
const stubbedCommands = ["defaults", "rex", "osascript"];

const themes = (await enumerateThemes(themesDir))._unsafeUnwrap();
const hasGhostty = process.platform === "darwin" && (await Bun.file(ghosttyBinary).exists());

const staleTweakBlock = `# >>> theme-picker >>>
font-thicken = true
theme = jonhoo
font-style-italic = false
font-style-bold = false
adjust-cell-width = "5%"
# <<< theme-picker <<<
`;

describe.skipIf(!hasGhostty)("every theme", () => {
  let root: string;
  let bin: string;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "theme-picker-themes-"));
    bin = path.join(root, "bin");
    await mkdir(bin);
    for (const command of stubbedCommands) {
      const stub = path.join(bin, command);
      await writeFile(stub, `#!/bin/sh\necho "${command} $*" >> "$HOME/calls.log"\nexit 0\n`);
      await chmod(stub, 0o755);
    }
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each(themes)(
    "%s uses plain MonoLisaCode 13 in Ghostty and Rex with real bold and italic",
    async (theme) => {
      const home = path.join(root, theme);
      const configPath = path.join(home, ".config", "ghostty", "config");
      await mkdir(path.dirname(configPath), { recursive: true });
      await writeFile(configPath, staleTweakBlock);
      const env = {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: path.join(home, ".config"),
        MSH_THEME_PICKER_THEMES_DIR: themesDir,
        PATH: `${bin}:${process.env.PATH}`,
      };
      for (const command of stubbedCommands) {
        if (Bun.which(command, { PATH: env.PATH }) !== path.join(bin, command)) {
          throw new Error(
            `the ${command} stub must come first on PATH, so the test keeps real state`,
          );
        }
      }

      const child = Bun.spawn([process.execPath, cliEntry, "apply", theme], {
        env,
        stdout: "ignore",
        stderr: "pipe",
      });
      const [stderr, exitCode] = await Promise.all([
        new Response(child.stderr).text(),
        child.exited,
      ]);
      expect({ exitCode, stderr }).toMatchObject({ exitCode: 0 });

      const ghostty = Bun.spawnSync([ghosttyBinary, "+show-config"], { env });
      const fontLines = ghostty.stdout
        .toString()
        .split("\n")
        .filter((line) => /^(font-|adjust-)/.test(line) && !line.startsWith("font-thicken "));
      expect(fontLines).toEqual([
        "font-family = MonoLisaCode",
        "font-family-bold = MonoLisaCode",
        "font-family-italic = MonoLisaCode",
        "font-family-bold-italic = MonoLisaCode",
      ]);

      const rexFontCalls = (await readFile(path.join(home, "calls.log"), "utf8"))
        .split("\n")
        .filter((line) => line.startsWith("defaults "));
      expect(rexFontCalls).toEqual([
        "defaults write com.superlogical.rex Workspace.terminalFontName -string MonoLisaCode",
        "defaults write com.superlogical.rex Workspace.terminalFontPointSize -float 13",
      ]);
    },
  );
});
