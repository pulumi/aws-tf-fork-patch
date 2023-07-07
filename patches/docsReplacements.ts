import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { EOL } from "os";
import ignore from "ignore";

export async function applyDocsReplacements(
  ctx: PatchContext,
  pathPattern: string,
  replacementsPath: string,
  ignores: string[]
) {
  const replacements = await readReplacements(replacementsPath);
  const files = await glob(pathPattern, { cwd: ctx.dir });
  const fileFilter = ignore().add(ignores);
  for (const file of files) {
    // Skip index - we don't use this in docs gen.
    if (fileFilter.ignores(file)) {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const { replaced, unmatched } = tryReplace(replacements, file, content);
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
    if (unmatched.length > 0) {
      printUnmatched(ctx, file, unmatched);
    }
  }
}

export function tryReplace(
  replacements: DocsReplacements,
  file: string,
  content: string
): { replaced: string; unmatched: LineReplacement[] } {
  let replaced = content;
  if (file in replacements) {
    const fileReplacements = replacements[file];
    return tryReplaceFile(fileReplacements, replaced);
  }
  return { replaced, unmatched: [] };
}

export type LineReplacement = {
  regExp?: boolean;
  regExpFlags?: string;
  old: string;
  new?: string;
};

export function printReplacement(r: LineReplacement): string {
  if (r.regExp) {
    return `/${r.old}/${r.new}/${r.regExpFlags ?? "g"}`;
  } else if (r.new) {
    return `${r.old} -> ${r.new}`;
  } else {
    return `${r.old} -> removed`;
  }
}

export type DocsReplacements = Record<string, LineReplacement[]>;

export function tryReplaceFile(
  fileReplacements: LineReplacement[],
  replaced: string
): { replaced: string; unmatched: LineReplacement[] } {
  const unmatched: LineReplacement[] = [];
  for (const replacement of fileReplacements) {
    const matcher = replacement.regExp
      ? new RegExp(replacement.old, replacement.regExpFlags ?? "g") // Regex
      : replacement.new !== undefined
      ? replacement.old // Simple find/replace
      : EOL + replacement.old; // Remove whole line
    const newReplacement = replaced.replaceAll(matcher, replacement.new ?? "");
    if (replaced === newReplacement) {
      const trimmed = (replacement.new ?? "").trim();
      if (trimmed === "" || !replaced.includes(trimmed)) {
        unmatched.push(replacement);
      }
    }
    replaced = newReplacement;
  }
  return { replaced, unmatched };
}

async function readReplacements(path: string): Promise<DocsReplacements> {
  const patchReplacements = await readFile(path, "utf-8");
  return JSON.parse(patchReplacements);
}

function printUnmatched(
  ctx: PatchContext,
  file: string,
  unmatched: LineReplacement[]
) {
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
