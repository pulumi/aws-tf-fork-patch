import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { EOL } from "os";

export async function applyDocsPatchReplacements(ctx: PatchContext) {
  const replacements = await readPatchReplacements();
  const suggestions: DocsReplacements = {};
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    if (file === "website/docs/index.html.markdown") {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const { replaced, unmatched } = tryReplace(replacements, file, content);
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
    if (unmatched.length > 0) {
      console.warn("Missed replacements in", join(ctx.dir, file), ":");
      console.warn(unmatched.map((m) => m.old).join(EOL));
    }
    if (!replaced.includes("Terraform")) {
      continue;
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

export async function applyDocsManualReplacements(ctx: PatchContext) {
  const replacements = await readManualReplacements();
  const suggestions: DocsReplacements = {};
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    if (file === "website/docs/index.html.markdown") {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const { replaced, unmatched } = tryReplace(replacements, file, content);
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
    if (unmatched.length > 0) {
      console.log(`Replacements not applied in ${join(ctx.dir, file)}:`);
      console.log(
        unmatched
          .map((m) => {
            const old = " - " + JSON.stringify(m.old);
            if (m.new !== undefined) {
              return old + EOL + " + " + JSON.stringify(m.new);
            }
            return old;
          })
          .join(EOL + "~" + EOL)
      );
      console.log();
    }
    if (!replaced.includes("Terraform")) {
      continue;
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
): { replaced: string; unmatched: LineReplacement[] } {
  const unmatched: LineReplacement[] = [];
  let replaced = content;
  if (file in replacements) {
    const fileReplacements = replacements[file];
    for (const replacement of fileReplacements) {
      const matcher = replacement.regExp
        ? new RegExp(replacement.old, replacement.regExpFlags ?? "g") // Regex
        : replacement.new !== undefined
        ? replacement.old // Simple find/replace
        : EOL + replacement.old; // Remove whole line
      const newReplacement = replaced.replaceAll(
        matcher,
        replacement.new ?? ""
      );
      if (replaced === newReplacement) {
        const trimmed = (replacement.new ?? "").trim();
        if (trimmed === "" || !replaced.includes(trimmed)) {
          unmatched.push(replacement);
        }
      }
      replaced = newReplacement;
    }
  }
  return { replaced, unmatched };
}

export type LineReplacement = {
  regExp?: boolean;
  regExpFlags?: string;
  old: string;
  new?: string;
};

export type DocsReplacements = Record<string, LineReplacement[]>;

async function readPatchReplacements(): Promise<DocsReplacements> {
  const patchReplacements = await import("./patchReplacements.json");
  return patchReplacements.default;
}
async function readManualReplacements(): Promise<DocsReplacements> {
  const manualReplacements = await import("./manualReplacements.json");
  return manualReplacements.default;
}
