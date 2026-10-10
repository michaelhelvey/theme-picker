import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { enumerateThemes, getThemesDir } from "../config";

describe("getThemesDir", () => {
  const DEFAULT_THEMES_DIR = path.join(import.meta.dirname, "../../", "themes");

  it("returns the default themes dir if no env var is provided", () => {
    const dir = getThemesDir();
    expect(dir).toEqual(DEFAULT_THEMES_DIR);
  });

  it("returns the env var if provided", () => {
    const customDir = "/users/me/home/Documents";
    expect(getThemesDir(customDir)).toEqual(customDir);
  });

  it("converts the user's home directory from a tilde", () => {
    const customDir = "~/home/Documents";
    const homeDir = os.homedir();
    const expected = path.join(homeDir, "/home/Documents");
    expect(getThemesDir(customDir)).toEqual(expected);
  });
});

describe("enumerateThemes", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "theme-picker-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("lists the .ts file names without extension, sorted, ignoring other entries", async () => {
    const themesDir = path.join(tmpDir, "themes");
    await mkdir(themesDir);
    await mkdir(path.join(themesDir, "nested"));
    await writeFile(path.join(themesDir, "solarized.ts"), "");
    await writeFile(path.join(themesDir, "nord.ts"), "");
    await writeFile(path.join(themesDir, "README.md"), "");

    const result = await enumerateThemes(themesDir);

    expect(result._unsafeUnwrap()).toEqual(["nord", "solarized"]);
  });

  it("returns a ThemesDirNotFound error for a missing directory", async () => {
    const missingDir = path.join(tmpDir, "missing");
    const result = await enumerateThemes(missingDir);

    expect(result._unsafeUnwrapErr()).toEqual({ type: "ThemesDirNotFound", dir: missingDir });
  });

  it("returns a ThemesDirReadFailed error when the path is not a directory", async () => {
    const filePath = path.join(tmpDir, "not-a-dir.ts");
    await writeFile(filePath, "");

    const result = await enumerateThemes(filePath);

    const error = result._unsafeUnwrapErr();
    expect(error.type).toEqual("ThemesDirReadFailed");
    expect(error).toHaveProperty("dir", filePath);
  });
});
