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
      const newReplacement =
        replacement.new !== undefined
          ? replaced.replaceAll(replacement.old, replacement.new) // Simple find/replace
          : replaced.replaceAll(EOL + replacement.old, ""); // Remove whole line
      if (replaced === newReplacement) {
        unmatched.push(replacement);
      }
      replaced = newReplacement;
    }
  }
  return { replaced, unmatched };
}

export type LineReplacement = {
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

function mergeReplacements(
  a: DocsReplacements,
  b: DocsReplacements
): DocsReplacements {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (k in result) {
      result[k] = [...result[k], ...v];
    } else {
      result[k] = v;
    }
  }
  return result;
}
