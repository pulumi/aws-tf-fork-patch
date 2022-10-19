// Original Source: https://github.com/dherault/parse-git-patch
import { EOL } from "os";

const hashRegex = /^From (\S*)/;
const authorRegex = /^From:\s?([^<].*[^>])?\s+(<(.*)>)?/;
const fileNameRegex = /^diff --git "?a\/(.*)"?\s*"?b\/(.*)"?/;
const fileLinesRegex = /^@@ -([0-9]*),?\S* \+([0-9]*),?/;
const similarityIndexRegex = /^similarity index /;
const addedFileModeRegex = /^new file mode /;
const deletedFileModeRegex = /^deleted file mode /;

export interface GitPatch {
  files: GitPatchFile[];
}

export interface GitPatchFile {
  added: boolean;
  deleted: boolean;
  beforeName: string;
  afterName: string;
  modifiedLines: GitPatchModifiedLine[];
}

export interface GitPatchModifiedLine {
  line: string;
  lineNumber: number;
  added: boolean;
}

export function parseGitPatch(patch: string) {
  if (typeof patch !== "string") {
    throw new Error("Expected first argument (patch) to be a string");
  }

  const lines = patch.split(EOL);

  const parsedPatch: GitPatch = {
    files: [],
  };

  splitIntoParts(lines, "diff --git").forEach((diff) => {
    const fileNameLine = diff.shift();
    if (fileNameLine === undefined) {
      throw new Error("Missing file name line");
    }
    const [, a, b] = fileNameLine.match(fileNameRegex) ?? [];
    const metaLine = diff.shift();
    if (metaLine === undefined) {
      throw new Error("Missing meta line");
    }

    const fileData: GitPatchFile = {
      added: false,
      deleted: false,
      beforeName: a.trim(),
      afterName: b.trim(),
      modifiedLines: [],
    };

    parsedPatch.files.push(fileData);

    if (addedFileModeRegex.test(metaLine)) {
      fileData.added = true;
    }
    if (deletedFileModeRegex.test(metaLine)) {
      fileData.deleted = true;
    }
    if (similarityIndexRegex.test(metaLine)) {
      return;
    }

    splitIntoParts(diff, "@@ ").forEach((lines) => {
      const fileLinesLine = lines.shift();
      if (fileLinesLine === undefined) {
        throw new Error("Missing file lines line");
      }
      const [, a, b] = fileLinesLine.match(fileLinesRegex) ?? [];

      let nA = parseInt(a);
      let nB = parseInt(b);

      lines.forEach((line) => {
        nA++;
        nB++;

        if (line.startsWith("-- ")) {
          return;
        }
        if (line.startsWith("+")) {
          nA--;

          fileData.modifiedLines.push({
            added: true,
            lineNumber: nB,
            line: line.substr(1),
          });
        } else if (line.startsWith("-")) {
          nB--;

          fileData.modifiedLines.push({
            added: false,
            lineNumber: nA,
            line: line.substr(1),
          });
        }
      });
    });
  });

  return parsedPatch;
}

// function parseHeader(lines: string[]) {
//   const hashLine = lines.shift();
//   if (hashLine === undefined) {
//     throw new Error("");
//   }
//   const hashMatch = hashLine.match(hashRegex);

//   const authorLine = lines.shift();
//   const authorMatch = authorLine.match(authorRegex);

//   const dateLine = lines.shift();
//   const dateMatch = dateLine.split("Date: ");

//   const messageLine = lines.shift();
//   const messageMatch = messageLine.split("Subject: ");

//   return {
//     hash: hashMatch?.[1],
//     author: authorMatch?.[1],
//     date: dateMatch?.[1],
//     message: messageMatch?.[1],
//   };
// }

function splitIntoParts(lines: string[], separator: string) {
  const parts = [];
  let currentPart: string[] | undefined;

  lines.forEach((line) => {
    if (line.startsWith(separator)) {
      if (currentPart) {
        parts.push(currentPart);
      }

      currentPart = [line];
    } else if (currentPart) {
      currentPart.push(line);
    }
  });

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}
