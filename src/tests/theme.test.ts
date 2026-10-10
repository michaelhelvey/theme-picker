import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

  it("replaces a symbolic link without changing the linked file", async () => {
    const targetPath = path.join(tmpDir, "fixture.lua");
    const linkPath = path.join(tmpDir, "colors.lua");
    await writeFile(targetPath, "return {}");
    await symlink(targetPath, linkPath);

    await writeFileContent(linkPath, "return { theme = 'jonhoo' }");

    expect(await readFile(linkPath, "utf8")).toEqual("return { theme = 'jonhoo' }");
    expect(await readFile(targetPath, "utf8")).toEqual("return {}");
  });
});
