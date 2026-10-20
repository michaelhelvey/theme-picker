import { afterAll, beforeAll, describe, expect, it } from "bun:test";
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
import { patchDelimitedBlock, writeFileContent } from "../theme";

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
