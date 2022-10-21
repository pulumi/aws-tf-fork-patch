import { GitPatch, GitPatchFile, GitPatchModifiedLine } from "./parseGitPatch";
import { DocsReplacements, LineReplacement } from "./patches";
import { groupBy, distinctBy, distinct, sortBy } from "array-fns";
import { EOL } from "os";

export function extractDocsReplacements(patch: GitPatch): DocsReplacements {
  const replacements: DocsReplacements = {};

  for (const file of patch.files) {
    const fileReplacements = getDocsReplacements(file);
    if (fileReplacements !== undefined) {
      replacements[file.afterName] = fileReplacements;
    }
  }

  return replacements;
}

function getDocsReplacements(file: GitPatchFile) {
  if (!file.afterName.startsWith("website/docs/")) {
    return undefined;
  }
  if (file.afterName !== file.beforeName) {
    // File rename - ignore
    return undefined;
  }
  const usedLineNumbers = new Set<number>();
  const fileReplacements: LineReplacement[] = [];
  const groupedByLine = groupBy(file.modifiedLines, (l) => l.lineNumber);
  for (const [lineNo, changes] of groupedByLine) {
    // Look for note removal
    if (changes.length === 1 && changes[0].added === false) {
      const line = changes[0].line;
      if (line.match(/\*\*note:?\*\*/i)) {
        fileReplacements.push({ old: line });
        usedLineNumbers.add(changes[0].lineNumber);
      }
    }

    // Look for a TF mention replacement
    if (changes.length === 2 && changes[0].added !== changes[1].added) {
      const [lineA, lineB] = changes;
      const added = lineA.added ? lineA : lineB;
      const removed = lineA.added ? lineB : lineA;
      // Only include if the removed line mentioned something TF specific
      if (
        removed.line.match(/(terraform)|(hashicorp)|(jsondecode)/i) !== null
      ) {
        fileReplacements.push({ old: removed.line, new: added.line });
        usedLineNumbers.add(changes[0].lineNumber);
      } else {
        // console.log(file.afterName, ":", lineNo, "non-tf replace:");
        // console.log("-", removed.line);
        // console.log("+", added.line);
      }
    }
  }

  // Look for contiguous blocks of removal
  const removalBlocks = findRemovalBlocks(groupedByLine);

  if (removalBlocks.length > 0) {
    for (const block of removalBlocks) {
      // Ignore whitespace-only removals
      if (block.trim() !== "") {
        fileReplacements.push({ old: block });
      }
    }
  } else {
    const unusedLines = distinct(file.modifiedLines.map((l) => l.lineNumber))
      .filter((n) => !usedLineNumbers.has(n))
      .sort();

    if (unusedLines.length > 2) {
      console.log(`${file.afterName}: unused lines: ${unusedLines.join(",")}`);
    }
  }

  if (fileReplacements.length === 0) {
    return undefined;
  }
  return distinctBy(fileReplacements, (line) => line.old);
}

function findRemovalBlocks(lineChanges: [number, GitPatchModifiedLine[]][]) {
  const sorted = sortBy(lineChanges, ([n]) => n);
  const removalBlocks: string[] = [];
  let state:
    | { name: "initial" }
    | { name: "mixed"; start: number; last: number }
    | { name: "block"; start: number; last: number; content: string[] } = {
    name: "initial",
  };

  const newMixed = (lineNo: number): typeof state => ({
    name: "mixed",
    start: lineNo,
    last: lineNo,
  });
  const newBlock = (change: GitPatchModifiedLine): typeof state => ({
    name: "block",
    start: change.lineNumber,
    last: change.lineNumber,
    content: [change.line],
  });

  for (const [lineNo, changes] of sorted) {
    if (changes.length !== 1 || changes[0].added !== false) {
      // Not pure removals
      switch (state.name) {
        case "initial":
          state = newMixed(lineNo);
          continue;
        case "mixed":
          if (state.last === lineNo - 1) {
            state = { ...state, last: lineNo };
          } else {
            state = newMixed(lineNo);
          }
          continue;
        case "block":
          if (state.last === lineNo - 1) {
            state = { name: "mixed", start: state.start, last: lineNo };
          } else {
            removalBlocks.push(state.content.join(EOL));
            state = { name: "mixed", start: lineNo, last: lineNo };
          }
          break;
      }
    } else {
      // Just a removal
      switch (state.name) {
        case "initial":
          state = newBlock(changes[0]);
          continue;
        case "mixed":
          state =
            state.last === lineNo - 1
              ? { ...state, last: lineNo } // continue mixed
              : newBlock(changes[0]);
          continue;
        case "block":
          if (state.last === lineNo - 1) {
            // append to block
            state = {
              ...state,
              last: lineNo,
              content: [...state.content, changes[0].line],
            };
          } else {
            removalBlocks.push(state.content.join(EOL));
            state = newBlock(changes[0]);
          }
          continue;
      }
    }
  }
  return removalBlocks;
}
