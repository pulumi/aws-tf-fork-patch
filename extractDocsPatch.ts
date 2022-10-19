import { GitPatch, GitPatchFile } from "./parseGitPatch";
import { DocsReplacements, LineReplacement } from "./patches";
import { groupBy, distinctBy } from "array-fns";

export function extractDocsReplacements(patch: GitPatch): DocsReplacements {
  const replacements: DocsReplacements = {};

  for (const file of patch.files) {
    const fileReplacements = getFileReplacements(file);
    if (fileReplacements !== undefined) {
      replacements[file.afterName] = fileReplacements;
    }
  }

  return replacements;
}

function getFileReplacements(file: GitPatchFile) {
  if (!file.afterName.startsWith("website/docs/")) {
    return undefined;
  }
  if (file.afterName !== file.beforeName) {
    // File rename - ignore
    return undefined;
  }
  const fileReplacements: LineReplacement[] = [];
  const groupedByLine = groupBy(file.modifiedLines, (l) => l.lineNumber);
  for (const [lineNo, changes] of groupedByLine) {
    if (changes.length === 1) {
      const action = changes[0].added ? "add" : "remove";
      console.info(`${file.afterName}:${lineNo} ${action} only`);
      continue;
    }
    if (changes.length !== 2) {
      console.warn(
        `${file.afterName}:${lineNo} ${changes.length} changes for line`
      );
      continue;
    }
    const [lineA, lineB] = changes;
    if (lineA.added === lineB.added) {
      console.warn(file.afterName, ":", lineNo, "not a +/- pairing");
      continue;
    }
    const added = lineA.added ? lineA : lineB;
    const removed = lineA.added ? lineB : lineA;
    if (removed.line.match(/(terraform)|(hashicorp)/i) !== null) {
      fileReplacements.push({ old: removed.line, new: added.line });
    } else {
      console.log(file.afterName, ":", lineNo, "non-tf replace");
    }
  }
  if (fileReplacements.length === 0) {
    return undefined;
  }
  return distinctBy(fileReplacements, (line) => line.old);
}
