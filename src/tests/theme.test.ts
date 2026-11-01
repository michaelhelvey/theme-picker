import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HerdrAppPalette } from "../theme";
import {
  parseRexSettings,
  patchDelimitedBlock,
  writeFileContent,
  writeHerdrAppTheme,
  writeHerdrAppFont,
} from "../theme";

describe("patchDelimitedBlock", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "theme-picker-block-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("appends a delimited block and creates the parent directory", async () => {
    const filePath = path.join(tmpDir, "nested", "config");

    const result = await patchDelimitedBlock(filePath, "#", "theme = jonhoo");

    expect(result._unsafeUnwrap()).toBeUndefined();
    expect(await readFile(filePath, "utf8")).toEqual(
      "# >>> theme-picker >>>\ntheme = jonhoo\n# <<< theme-picker <<<\n",
    );
  });

  it("patches a relative symlink through a linked parent directory", async () => {
    const dotfilesDir = path.join(tmpDir, "dotfiles");
    const configDir = path.join(dotfilesDir, "herdr");
    const linkedDir = path.join(tmpDir, "linked-config");
    await mkdir(configDir, { recursive: true });
    await symlink(dotfilesDir, linkedDir);
    const targetPath = path.join(configDir, "tracked.toml");
    await writeFile(targetPath, "onboarding = false\n");
    await symlink("tracked.toml", path.join(configDir, "config.toml"));
    const linkPath = path.join(linkedDir, "herdr", "config.toml");

    const first = await patchDelimitedBlock(linkPath, "#", 'name = "old"');
    const second = await patchDelimitedBlock(linkPath, "#", 'name = "new"');

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(await readlink(linkedDir)).toEqual(dotfilesDir);
    expect(await readlink(linkPath)).toEqual("tracked.toml");
    expect(await readFile(targetPath, "utf8")).toEqual(
      'onboarding = false\n\n# >>> theme-picker >>>\nname = "new"\n# <<< theme-picker <<<\n',
    );
  });

  it("replaces an existing block and keeps the content around it", async () => {
    const filePath = path.join(tmpDir, "existing.conf");
    await writeFile(
      filePath,
      [
        "before = true",
        "# >>> theme-picker >>>",
        "theme = old",
        "# <<< theme-picker <<<",
        "after = true",
        "",
      ].join("\n"),
    );

    await patchDelimitedBlock(filePath, "#", "theme = new");

    expect(await readFile(filePath, "utf8")).toEqual(
      [
        "before = true",
        "# >>> theme-picker >>>",
        "theme = new",
        "# <<< theme-picker <<<",
        "after = true",
        "",
      ].join("\n"),
    );
  });
});

describe("writeFileContent", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "theme-picker-write-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes through a symbolic link and keeps its target", async () => {
    const targetPath = path.join(tmpDir, "fixture.lua");
    const linkPath = path.join(tmpDir, "colors.lua");
    await writeFile(targetPath, "return {}");
    await symlink(targetPath, linkPath);

    const result = await writeFileContent(linkPath, "return { theme = 'jonhoo' }");

    expect(result.isOk()).toBe(true);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    expect(await readlink(linkPath)).toEqual(targetPath);
    expect(await readFile(targetPath, "utf8")).toEqual("return { theme = 'jonhoo' }");
  });

  it("follows a chain of relative symbolic links", async () => {
    const targetPath = path.join(tmpDir, "chain-target.lua");
    const middlePath = path.join(tmpDir, "chain-middle.lua");
    const linkPath = path.join(tmpDir, "chain-link.lua");
    await writeFile(targetPath, "old");
    await symlink(path.basename(targetPath), middlePath);
    await symlink(path.basename(middlePath), linkPath);

    const result = await writeFileContent(linkPath, "new");

    expect(result.isOk()).toBe(true);
    expect(await readlink(linkPath)).toEqual(path.basename(middlePath));
    expect(await readlink(middlePath)).toEqual(path.basename(targetPath));
    expect(await readFile(targetPath, "utf8")).toEqual("new");
  });

  it("creates a missing symbolic link target without replacing the link", async () => {
    const targetPath = path.join(tmpDir, "missing-target.lua");
    const linkPath = path.join(tmpDir, "missing-link.lua");
    await symlink(targetPath, linkPath);

    const result = await writeFileContent(linkPath, "new");

    expect(result.isOk()).toBe(true);
    expect(await readlink(linkPath)).toEqual(targetPath);
    expect(await readFile(targetPath, "utf8")).toEqual("new");
  });

  it("keeps a broken link when the target parent is missing", async () => {
    const targetPath = path.join(tmpDir, "missing-parent", "config");
    const linkPath = path.join(tmpDir, "broken-link");
    await symlink(targetPath, linkPath);

    const result = await writeFileContent(linkPath, "new");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ operation: "write", filePath: linkPath });
    expect(await readlink(linkPath)).toEqual(targetPath);
  });

  it("keeps file permissions when it replaces content", async () => {
    const filePath = path.join(tmpDir, "private.conf");
    await writeFile(filePath, "old content that must be truncated");
    await chmod(filePath, 0o600);

    const result = await writeFileContent(filePath, "new");

    expect(result.isOk()).toBe(true);
    expect(await readFile(filePath, "utf8")).toEqual("new");
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });
});

describe("parseRexSettings", () => {
  it("reads both themes of a dark and light pair and the font", () => {
    const settings = parseRexSettings(
      [
        'font-family = "MonoLisaCode"',
        "font-thicken = true",
        "font-size = 13",
        "theme = dark:Night Owl,light:dayowl",
      ].join("\n"),
    );

    expect(settings).toEqual({
      themeNames: ["Night Owl", "dayowl"],
      fontFamily: "MonoLisaCode",
      fontSize: 13,
    });
  });

  it("reads a single theme and leaves out the settings the content does not set", () => {
    const settings = parseRexSettings("theme = Gruber Darker\nfont-size = big");

    expect(settings).toEqual({
      themeNames: ["Gruber Darker"],
      fontFamily: undefined,
      fontSize: undefined,
    });
  });
});

const STANDARD_ANSI = [
  "#000000",
  "#800000",
  "#008000",
  "#808000",
  "#000080",
  "#800080",
  "#008080",
  "#c0c0c0",
  "#808080",
  "#ff0000",
  "#00ff00",
  "#ffff00",
  "#0000ff",
  "#ff00ff",
  "#00ffff",
  "#ffffff",
];

function makePalette(background: string, foreground: string): HerdrAppPalette {
  return {
    background,
    foreground,
    selection: "#333333",
    cursor: foreground,
    ansi: STANDARD_ANSI,
  };
}

describe("writeHerdrAppTheme", () => {
  it("copies font settings through a Stow link without changing zoom or colors", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "herdr-font-"));
    const target = path.join(directory, "tracked.json");
    const link = path.join(directory, "settings.json");
    await writeFile(target, JSON.stringify({ zoom: 0.9, font: "old", theme: "moss" }));
    await symlink(target, link);
    const result = await writeHerdrAppFont(
      'font-family = "MonoLisaCode"\nfont-size = 13',
      directory,
    );
    expect(result.isOk()).toBe(true);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual({
      zoom: 0.9,
      font: "MonoLisaCode",
      font_size: 13,
      theme: "moss",
    });
    await writeHerdrAppFont("font-size = 15", directory);
    expect(JSON.parse(await readFile(target, "utf8"))).toMatchObject({
      font: "MonoLisaCode",
      font_size: 15,
    });
    await rm(directory, { recursive: true, force: true });
  });

  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "theme-picker-herdr-app-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("uses the Herdr font family only when all four local faces are present", async () => {
    const fonts = path.join(tmpDir, "fonts");
    await mkdir(fonts);
    for (const face of ["Regular", "Italic", "Bold"]) {
      await writeFile(path.join(fonts, `MonoLisaCodeHerdr-${face}.ttf`), "");
    }
    await writeHerdrAppFont('font-family = "MonoLisaCode"', tmpDir);
    const settings = path.join(tmpDir, "settings.json");
    expect(JSON.parse(await readFile(settings, "utf8"))).toMatchObject({ font: "MonoLisaCode" });

    await writeFile(path.join(fonts, "MonoLisaCodeHerdr-BoldItalic.ttf"), "");
    await writeHerdrAppFont('font-family = "MonoLisaCode"', tmpDir);
    expect(JSON.parse(await readFile(settings, "utf8"))).toMatchObject({
      font: "MonoLisaCode Herdr",
    });

    await writeHerdrAppFont('font-family = "Geist Mono"', tmpDir);
    expect(JSON.parse(await readFile(settings, "utf8"))).toMatchObject({ font: "Geist Mono" });
  });

  it("writes both appearance palettes and keeps every other setting", async () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    const original = {
      zoom: 1.25,
      sounds: { enabled: false },
      theme: "graphite",
      colors: { accent: "#ff0000" },
    };
    await writeFile(settingsPath, `${JSON.stringify(original)}\n`);
    const dark = makePalette("#101010", "#eeeeee");
    const light = makePalette("#fafafa", "#111111");

    const result = await writeHerdrAppTheme(tmpDir, { dark, light });

    expect(result.isOk()).toBe(true);
    expect(JSON.parse(await readFile(settingsPath, "utf8"))).toEqual({
      ...original,
      theme: { light: "theme-picker-light", dark: "theme-picker-dark" },
    });
    expect(
      JSON.parse(await readFile(path.join(tmpDir, "themes", "theme-picker-dark.json"), "utf8")),
    ).toEqual(dark);
    expect(
      JSON.parse(await readFile(path.join(tmpDir, "themes", "theme-picker-light.json"), "utf8")),
    ).toEqual(light);
  });

  it("writes one palette for every appearance when the theme has no light palette", async () => {
    const dark = makePalette("#101010", "#eeeeee");

    const result = await writeHerdrAppTheme(tmpDir, { dark });

    expect(result.isOk()).toBe(true);
    expect(JSON.parse(await readFile(path.join(tmpDir, "settings.json"), "utf8"))).toEqual({
      theme: "theme-picker",
    });
    expect(
      JSON.parse(await readFile(path.join(tmpDir, "themes", "theme-picker.json"), "utf8")),
    ).toEqual(dark);
    expect(await Bun.file(path.join(tmpDir, "themes", "theme-picker-dark.json")).exists()).toBe(
      false,
    );
  });

  it("updates settings through a Stow symlink and keeps the link", async () => {
    const dotfilesDir = path.join(tmpDir, "dotfiles");
    await mkdir(dotfilesDir, { recursive: true });
    const targetPath = path.join(dotfilesDir, "settings.json");
    await writeFile(targetPath, '{"zoom":1}\n');
    const linkPath = path.join(tmpDir, "settings.json");
    await symlink(targetPath, linkPath);

    const result = await writeHerdrAppTheme(tmpDir, { dark: makePalette("#101010", "#eeeeee") });

    expect(result.isOk()).toBe(true);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    expect(await readlink(linkPath)).toEqual(targetPath);
    expect(JSON.parse(await readFile(targetPath, "utf8"))).toEqual({
      zoom: 1,
      theme: "theme-picker",
    });
  });

  it("leaves invalid settings alone and writes no theme file", async () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    await writeFile(settingsPath, "{ not json");

    const result = await writeHerdrAppTheme(tmpDir, { dark: makePalette("#101010", "#eeeeee") });

    expect(result._unsafeUnwrapErr()).toMatchObject({ operation: "parse", filePath: settingsPath });
    expect(await readFile(settingsPath, "utf8")).toEqual("{ not json");
    expect(await Bun.file(path.join(tmpDir, "themes", "theme-picker.json")).exists()).toBe(false);
  });

  it("rejects a palette that does not have 16 ANSI colors", async () => {
    const dark = { ...makePalette("#101010", "#eeeeee"), ansi: ["#000000"] };

    const result = await writeHerdrAppTheme(tmpDir, { dark });

    expect(result.isErr()).toBe(true);
    expect(await Bun.file(path.join(tmpDir, "themes", "theme-picker.json")).exists()).toBe(false);
  });
});
