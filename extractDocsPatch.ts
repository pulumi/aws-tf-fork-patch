import { GitPatch, GitPatchFile } from "./parseGitPatch";
import { DocsReplacements, LineReplacement } from "./patches";
import { groupBy, distinctBy } from "array-fns";

export function extractDocsReplacements(patch: GitPatch): DocsReplacements {
  const replacements: DocsReplacements = {};

  for (const file of patch.files) {
    const fileReplacements = getTfMentionReplacements(file);
    if (fileReplacements !== undefined) {
      replacements[file.afterName] = fileReplacements;
    }
  }

  return replacements;
}

function getTfMentionReplacements(file: GitPatchFile) {
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
    // Look for note removal
    if (changes.length === 1 && changes[0].added === false) {
      const line = changes[0].line;
      if (line.match(/\*\*note:?\*\*/i)) {
        fileReplacements.push({ old: line });
      }
    }

    // Look for a "+/-" pairing
    if (changes.length === 2 && changes[0].added !== changes[1].added) {
      const [lineA, lineB] = changes;
      const added = lineA.added ? lineA : lineB;
      const removed = lineA.added ? lineB : lineA;
      // Only include if the removed line mentioned something
      if (
        removed.line.match(/(terraform)|(hashicorp)|(jsondecode)/i) !== null
      ) {
        fileReplacements.push({ old: removed.line, new: added.line });
      } else {
        // console.log(file.afterName, ":", lineNo, "non-tf replace:");
        // console.log("-", removed.line);
        // console.log("+", added.line);
      }
    }
  }
  if (fileReplacements.length === 0) {
    return undefined;
  }
  return distinctBy(fileReplacements, (line) => line.old);
}
