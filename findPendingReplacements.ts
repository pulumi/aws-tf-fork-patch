import { readFile } from "fs/promises";
import { EOL } from "os";
import { join } from "path";
import { PatchContext } from "./config";
import { DocsReplacements, LineReplacement } from "./patches/docsReplacements";
import glob from "fast-glob";

export async function findPendingReplacements(ctx: PatchContext) {
  const suggestions: DocsReplacements = {};
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    if (file === "website/docs/index.html.markdown") {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const pendingReplacements = findFileReplacements(content);
    if (pendingReplacements.length > 0) {
      suggestions[file] = pendingReplacements;
    }
  }
  return suggestions;
}

export function findFileReplacements(content: string): LineReplacement[] {
  return content
    .split(EOL)
    .filter(
      (line) =>
        line.match(/(terraform)|(hashicorp)/i) !== null &&
        !line.startsWith("```terraform") &&
        !line.startsWith(" ```terraform") &&
        !line.startsWith("$ terraform import") &&
        !line.startsWith("terraform import") &&
        !line.startsWith("`$ terraform import")
    )
    .map((line) => ({
      old: line,
      new: buildSuggestion(line),
    }));
}

function buildSuggestion(line: string): string {
  if (line.match(/terraform/i)) {
    return line.replaceAll(/terraform/gi, "TODO");
  }
  if (line.match(/hashicorp/i)) {
    return line.replaceAll(/hashicorp/gi, "TODO");
  }
  return line;
}
