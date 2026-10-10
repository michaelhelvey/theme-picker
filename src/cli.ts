import { defineCommand } from "citty";
import type { ResultAsync } from "neverthrow";
import { enumerateThemes, getThemesDir, loadTheme } from "./config";

function runResult<T, E>(command: string, result: ResultAsync<T, E>): Promise<void> {
  return result.match(
    () => undefined,
    (error) => {
      console.error(`command '${command}' exited with error:`);
      console.error(error);
      process.exitCode = 1;
    },
  );
}

const apply = defineCommand({
  meta: { name: "apply", description: "apply a theme" },
  args: { theme: { type: "positional", description: "The theme name to apply", required: true } },
  async run({ args }) {
    return runResult(
      "apply",
      loadTheme(getThemesDir(), args.theme).andThen((theme) => theme.apply()),
    );
  },
});

const list = defineCommand({
  meta: { name: "list", description: "list available themes from configured directory" },
  async run() {
    return runResult(
      "list",
      enumerateThemes(getThemesDir()).map((themes) => {
        console.log(`discovered ${themes.length} themes:`);

        themes.forEach((t) => {
          console.log(`\t ${t}`);
        });
      }),
    );
  },
});

export const cli = defineCommand({
  meta: {
    name: "theme-picker",
    version: "1.0.0",
    description:
      "manage groups of config files to change the look and feel of your terminal all at once",
  },
  subCommands: { apply, list },
});
