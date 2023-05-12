import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import {
  LineReplacement,
  printReplacement,
  tryReplaceFile,
} from "./docsReplacements";
import ignore from "ignore";
import { join } from "path";

export async function globReplace(
  ctx: PatchContext,
  replacementsPath: string,
  ignores: string[]
) {
  const fileFilter = ignore().add(ignores);
  const replacements = await readGlobalReplacements(replacementsPath);
  for (const globReplacement of replacements) {
    console.log(
      `Replacing ${globReplacement.glob}: ${globReplacement.replacements}`
    );
    for (const replacement of globReplacement.replacements) {
      console.log(printReplacement(replacement));
    }
    const files = await glob(globReplacement.glob, { cwd: ctx.dir });
    for (const file of files) {
      if (fileFilter.ignores(file)) {
        continue;
      }
      const filePath = join(ctx.dir, file);
      const content = await readFile(filePath, { encoding: "utf-8" });
      const { replaced } = tryReplaceFile(
        globReplacement.replacements,
        content
      );
      if (replaced != content) {
        console.log(`Replacing ${file}`);
        await writeFile(filePath, replaced);
      }
    }
  }
}

export type GlobReplacement = {
  glob: string;
  replacements: LineReplacement[];
};

export type GlobalReplacements = GlobReplacement[];

async function readGlobalReplacements(
  path: string
): Promise<GlobalReplacements> {
  const patchReplacements = await readFile(path, "utf-8");
  return JSON.parse(patchReplacements);
}
