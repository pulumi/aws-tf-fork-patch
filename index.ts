#!/usr/bin/env node

import { resolve } from "path";
import { access, readFile, writeFile } from "fs/promises";
import { constants } from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { PatchContext } from "./config";
import * as patches from "./patches";
import { parseGitPatch } from "./parseGitPatch";
import { extractDocsReplacements } from "./extractDocsPatch";

yargs(hideBin(process.argv))
  .command(
    "apply [options]",
    "Apply AWS TF fork patches onto working directory",
    {
      cwd: { desc: "Target directory", default: "." },
    },
    async (args) => {
      const dir = resolve(args.cwd);
      // Fail fast if we don't have access
      await access(dir, constants.W_OK | constants.R_OK);
      const config: PatchContext = {
        dir,
      };

      console.log("Applying patches ");
      await patches.applyTagsAll(config);
      await patches.applyStripDocLinks(config);
      await patches.applyDocsTerraformReplace(config);
    }
  )
  .command(
    "parse-patch [file]",
    "Parse a patch file",
    {
      file: { desc: "Patch file path", type: "string", demand: true },
      outFile: {
        desc: "Output replacement file path",
        default: "patchReplacements.json",
      },
    },
    async (args) => {
      const content = await readFile(args.file, "utf-8");
      const patch = parseGitPatch(content);
      const replacement = extractDocsReplacements(patch);
      await writeFile(args.outFile, JSON.stringify(replacement, null, 2));
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();
