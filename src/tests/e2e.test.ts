import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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

  it("reports an unknown theme and exits with a failure code", async () => {
    const result = await runCli(["apply", "missing"], themesDir);

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toContain("ThemeNotFound");
    expect(result.stderr).toContain("missing");
  });
});
