import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommand } from "../theme";

const themeHelper = path.join(import.meta.dirname, "..", "theme.ts");

describe("runCommand", () => {
  it("keeps the exit code and the command error output", async () => {
    const result = await runCommand(process.execPath, [
      "-e",
      'console.error("Cannot select a Rex client"); process.exit(7);',
    ]);

    expect(result._unsafeUnwrapErr()).toEqual({
      type: "CommandExitFailed",
      command: process.execPath,
      exitCode: 7,
      stderr: "Cannot select a Rex client",
    });
  });

  it("drains stderr while the command runs", async () => {
    const result = await runCommand(process.execPath, [
      "-e",
      'process.stderr.write("x".repeat(1024 * 1024));',
    ]);

    expect(result.isOk()).toBe(true);
  });

  it("reports a command that cannot start", async () => {
    const result = await runCommand("/nonexistent/theme-picker-command", []);

    expect(result._unsafeUnwrapErr()).toMatchObject({
      type: "CommandStartFailed",
      command: "/nonexistent/theme-picker-command",
    });
  });

  it("shows the command error and continues after an optional command fails", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        `import { tryRunCommand } from ${JSON.stringify(themeHelper)};
       await tryRunCommand(process.execPath, ["-e", 'console.error("Remote Control is disabled"); process.exit(1)']);
       console.log("continued");`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("continued");
    expect(stderr).toContain("exited with code 1: Remote Control is disabled");
  });
});

const canCheckClosedGhostty =
  process.platform === "darwin" &&
  (await Bun.file("/Applications/Ghostty.app/Contents/MacOS/ghostty").exists()) &&
  Bun.spawnSync(["pgrep", "-x", "Ghostty"]).exitCode === 1;

describe.skipIf(!canCheckClosedGhostty)("closed Ghostty", () => {
  let home: string;

  beforeAll(async () => {
    home = await mkdtemp(path.join(os.tmpdir(), "theme-picker-closed-ghostty-"));
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("writes the shared font to Ghostty and Rex without a reload warning or starting Ghostty", async () => {
    const config = path.join(home, ".config", "ghostty", "config");
    const bin = path.join(home, "bin");
    const defaultsLog = path.join(home, "defaults.log");
    await mkdir(bin);
    await writeFile(path.join(bin, "defaults"), `#!/bin/sh\necho "$@" >> "${defaultsLog}"\n`);
    await chmod(path.join(bin, "defaults"), 0o755);
    const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` };
    if (Bun.which("defaults", { PATH: env.PATH }) !== path.join(bin, "defaults")) {
      throw new Error(
        "the defaults stub must come first on PATH, so the test keeps real Rex prefs",
      );
    }
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        `import { applyGhosttyConfig } from ${JSON.stringify(themeHelper)};
       const result = await applyGhosttyConfig(${JSON.stringify(config)}, 'font-family = "Menlo"\\nfont-size = 20');
       process.exit(result.isOk() ? 0 : 1);`,
      ],
      { env, stdout: "pipe", stderr: "pipe" },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    const ghostty = Bun.spawnSync(
      ["/Applications/Ghostty.app/Contents/MacOS/ghostty", "+show-config"],
      { env: { ...env, XDG_CONFIG_HOME: path.join(home, ".config") } },
    );
    const fontLines = ghostty.stdout
      .toString()
      .split("\n")
      .filter((line) => /^font-(family|size)/.test(line));
    expect(fontLines).toEqual([
      "font-family = MonoLisaCode",
      "font-family-bold = MonoLisaCode",
      "font-family-italic = MonoLisaCode",
      "font-family-bold-italic = MonoLisaCode",
    ]);
    expect((await readFile(defaultsLog, "utf8")).split("\n")).toEqual([
      "write com.superlogical.rex Workspace.terminalFontName -string MonoLisaCode",
      "write com.superlogical.rex Workspace.terminalFontPointSize -float 13",
      "",
    ]);
    expect(Bun.spawnSync(["pgrep", "-x", "Ghostty"]).exitCode).toBe(1);
  });
});
