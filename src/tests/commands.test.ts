import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

  it("writes the config without a reload warning or starting Ghostty", async () => {
    const config = path.join(home, ".config", "ghostty", "config");
    const child = Bun.spawn(
      [
        process.execPath,
        "-e",
        `import { applyGhosttyConfig } from ${JSON.stringify(themeHelper)};
       const result = await applyGhosttyConfig(${JSON.stringify(config)}, "font-thicken = true");
       process.exit(result.isOk() ? 0 : 1);`,
      ],
      { env: { ...process.env, HOME: home }, stdout: "pipe", stderr: "pipe" },
    );
    const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(await readFile(config, "utf8")).toContain("font-thicken = true");
    expect(Bun.spawnSync(["pgrep", "-x", "Ghostty"]).exitCode).toBe(1);
  });
});
