import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, readlink, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.join(import.meta.dirname, "..", "..");
const cliEntry = path.join(repoRoot, "src", "index.ts");
const themeHelper = path.join(repoRoot, "src", "theme.ts");

interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

async function runCli(args: string[], themesDir: string): Promise<CliResult> {
  const child = Bun.spawn([process.execPath, cliEntry, ...args], {
    env: { ...process.env, MSH_THEME_PICKER_THEMES_DIR: themesDir },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  return { stdout, stderr, exitCode };
}

function themeModuleSource(target: string): string {
  return [
    `import { writeFileContent } from ${JSON.stringify(themeHelper)};`,
    "",
    "export default {",
    `  apply: () => writeFileContent(${JSON.stringify(target)}, "applied"),`,
    "};",
    "",
  ].join("\n");
}

describe("theme-picker cli", () => {
  let themesDir: string;
  let alphaTarget: string;
  let betaTarget: string;

  beforeAll(async () => {
    themesDir = await mkdtemp(path.join(repoRoot, ".e2e-themes-"));
    alphaTarget = path.join(themesDir, "alpha-output.txt");
    betaTarget = path.join(themesDir, "beta-output.txt");
    await writeFile(path.join(themesDir, "alpha.ts"), themeModuleSource(alphaTarget));
    await writeFile(path.join(themesDir, "beta.ts"), themeModuleSource(betaTarget));
  });

  afterAll(async () => {
    await rm(themesDir, { recursive: true, force: true });
  });

  it("lists the themes from the configured directory", async () => {
    const result = await runCli(["list"], themesDir);

    expect(result.exitCode).toEqual(0);
    expect(result.stdout).toContain("discovered 2 themes:");
    expect(result.stdout).toContain("alpha");
    expect(result.stdout).toContain("beta");
  });

  it("applies the named theme and writes only its target", async () => {
    const result = await runCli(["apply", "alpha"], themesDir);

    expect(result.exitCode).toEqual(0);
    expect(await readFile(alphaTarget, "utf8")).toEqual("applied");

    const betaFileExists = await stat(betaTarget).then(
      () => true,
      () => false,
    );
    expect(betaFileExists).toEqual(false);
  });

  it("changes themes through Stow-style links without replacing them", async () => {
    const homeDir = path.join(themesDir, "home");
    const dotfilesDir = path.join(homeDir, ".dotfiles");
    const fixtureThemes = path.join(themesDir, "linked-themes");
    await mkdir(path.join(homeDir, ".config", "herdr"), { recursive: true });
    await mkdir(path.join(dotfilesDir, ".config", "herdr"), { recursive: true });
    await mkdir(fixtureThemes);
    const configs = [".tmux.conf", ".config/herdr/config.toml"];

    for (const config of configs) {
      const targetPath = path.join(dotfilesDir, config);
      const linkPath = path.join(homeDir, config);
      await writeFile(targetPath, "# user settings\n");
      await symlink(path.relative(path.dirname(linkPath), targetPath), linkPath);
    }

    for (const name of ["dark", "light"]) {
      await writeFile(
        path.join(fixtureThemes, `${name}.ts`),
        [
          `import { patchDelimitedBlock } from ${JSON.stringify(themeHelper)};`,
          "export default {",
          `  apply: () => patchDelimitedBlock(${JSON.stringify(path.join(homeDir, ".tmux.conf"))}, "#", "theme = ${name}")`,
          `    .andThen(() => patchDelimitedBlock(${JSON.stringify(path.join(homeDir, ".config/herdr/config.toml"))}, "#", "theme = ${name}")),`,
          "};",
        ].join("\n"),
      );
    }

    for (const name of ["dark", "light", "light"]) {
      const result = await runCli(["apply", name], fixtureThemes);
      expect(result.exitCode).toBe(0);

      for (const config of configs) {
        const targetPath = path.join(dotfilesDir, config);
        const linkPath = path.join(homeDir, config);
        expect(await readlink(linkPath)).toEqual(path.relative(path.dirname(linkPath), targetPath));
        expect(await readFile(targetPath, "utf8")).toEqual(
          `# user settings\n\n# >>> theme-picker >>>\ntheme = ${name}\n# <<< theme-picker <<<\n`,
        );
      }
    }
  });

  it("reports an unknown theme and exits with a failure code", async () => {
    const result = await runCli(["apply", "missing"], themesDir);

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toContain("ThemeNotFound");
    expect(result.stderr).toContain("missing");
  });
});
