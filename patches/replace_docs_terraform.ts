import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join, relative } from "path";
import { EOL } from "os";

export async function applyDocsTerraformReplace(ctx: PatchContext) {
  const replacements = await readReplacements();
  const suggestions: DocsReplacements = {};
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    if (file === "website/docs/index.html.markdown") {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const replaced = tryReplace(replacements, file, content);
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
    if (!replaced.includes("Terraform")) {
      continue;
    }
    // Build suggestions for pending replacements
    const tfLines: [number, string][] = [];
    content.split(EOL).forEach((line, i) => {
      if (line.includes("Terraform")) {
        tfLines.push([i + 1, line]);
      }
    });
    if (tfLines.length > 0) {
      const suggestedFileReplacements = tfLines.map(([n, old]) => ({
        old: old,
        new: buildSuggestion(old),
      }));
      suggestions[file] = suggestedFileReplacements;
    }
  }
  if (Object.keys(suggestions).length > 0) {
    writeFile(
      "suggestedReplacements.json",
      JSON.stringify(suggestions, null, 2) + EOL
    );
    console.log(`"Terraform" found in docs, see suggestedReplacements.json`);
  }
}

function tryReplace(
  replacements: DocsReplacements,
  file: string,
  content: string
): string {
  let replaced = content;
  if (file in replacements) {
    const fileReplacements = replacements[file];
    for (const replacement of fileReplacements) {
      const newReplacement =
        replacement.new !== undefined
          ? replaced.replace(replacement.old, replacement.new) // Simple find/replace
          : replaced.replace(EOL + replacement.old, ""); // Remove whole line
      if (replaced === newReplacement) {
        console.warn("Replacement not matched:", file, "\n", replacement.old);
      }
      replaced = newReplacement;
    }
  }
  return replaced;
}

function buildSuggestion(line: string): string {
  // if (line.includes("Terraform data source")) {
  //   return line.replace("Terraform data source", "data source");
  // }
  // if (line.includes("Terraform will fail")) {
  //   return line.replace("Terraform will fail", "the provider will fail");
  // }
  // if (line.includes("which Terraform is")) {
  //   return line.replace("which Terraform is", "which the provider is");
  // }
  // if (line.includes("Terraform's")) {
  //   return line.replace("Terraform's", "the provider's");
  // }
  return line;
}

export type LineReplacement = {
  old: string;
  new?: string;
};

export type DocsReplacements = Record<string, LineReplacement[]>;

async function readReplacements(): Promise<DocsReplacements> {
  const patchReplacements = await import("./patchReplacements.json");
  return patchReplacements.default;
}
