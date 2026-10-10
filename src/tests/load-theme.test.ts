import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTheme } from "../config";

describe("loadTheme", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "theme-picker-load-"));
    await writeFile(path.join(tmpDir, "good.ts"), "export default { apply: () => ({}) };\n");
    await writeFile(path.join(tmpDir, "bad.ts"), "export default { nope: true };\n");
    await writeFile(path.join(tmpDir, "broken.ts"), 'throw new Error("boom");\n');
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("loads a theme module with an apply method", async () => {
    const theme = (await loadTheme(tmpDir, "good"))._unsafeUnwrap();

    expect(typeof theme.apply).toEqual("function");
  });

  it("returns ThemeNotFound for a theme that is not in the directory", async () => {
    const result = await loadTheme(tmpDir, "missing");

    expect(result._unsafeUnwrapErr()).toEqual({ type: "ThemeNotFound", theme: "missing" });
  });

  it("returns ThemeModuleInvalid when the default export has no apply method", async () => {
    const result = await loadTheme(tmpDir, "bad");

    expect(result._unsafeUnwrapErr()).toEqual({ type: "ThemeModuleInvalid", theme: "bad" });
  });

  it("returns ThemeLoadFailed when the theme module cannot be imported", async () => {
    const result = await loadTheme(tmpDir, "broken");

    const error = result._unsafeUnwrapErr();
    expect(error).toMatchObject({ type: "ThemeLoadFailed", theme: "broken" });
  });
});
