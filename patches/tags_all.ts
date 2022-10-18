import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export async function applyTagsAll(ctx: PatchContext) {
  const files = await glob("internal/service/**/*.go", { cwd: ctx.dir });
  for (const file of files) {
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    // Note: capture the spacing to maintain alignment
    const replaced = content.replace(
      /"tags_all":(\s+)tftags\.TagsSchemaComputed\(\)/g,
      `"tags_all":$1tftags.TagsSchemaTrulyComputed()`
    );
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
  }
}
