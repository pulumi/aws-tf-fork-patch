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
import { findPendingReplacements } from "./findPendingReplacements";
import { mergeReplacements } from "./mergeReplacements";
import { sumBy } from "array-fns";
import { promisify } from "util";
import { exec, execSync, spawn } from "child_process";

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

      await patches.applyFileEdits(config);
      // Fix tags_all fields
      await patches.applyTagsAll(config);
      // Special set of replacements derived from the original git diff
      await patches.applyDocsPatchReplacements(config);
      // Auto-strip TF & relative links
      await patches.applyStripDocLinks(config);
      // Apply manual replacements - anything the automated steps can't handle
      // These are generated using the suggest command
      await patches.applyDocsManualReplacements(config);
      // Apply overlays last as they shouldn't be modified
      await patches.applyOverlays(config);
      // Reformat internal code
      await patches.applyGoFmt(config);

      // Generate replacements
      // Format replacements
      // TODO: make better suggestions - e.g. 3 words each side
      // TODO: Apply replacements ignoring line breaks
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
  .command(
    "format-replacements",
    "Sort and de-duplicate a replacements file",
    {
      path: {
        desc: "Output suggestions file path",
        default: "patches/manualReplacements.json",
      },
    },
    async (args) => {
      const existing = await readFile(args.path, "utf-8");
      const output = mergeReplacements(JSON.parse(existing), {});
      await writeFile(args.path, JSON.stringify(output, null, 2));
    }
  )
  .command(
    "add-working-docs",
    "Adopt changes from working directory",
    {
      cwd: { desc: "Target directory", default: "." },
      outFile: {
        desc: "Output suggestions file path",
        default: "patches/manualReplacements.json",
      },
    },
    async (args) => {
      const content = execSync("git diff website", {
        cwd: args.cwd,
        encoding: "utf-8",
      });
      const patch = parseGitPatch(content);
      const replacements = extractDocsReplacements(patch, {
        includeAllChanges: true,
      });
      const existing = await readFile(args.outFile, "utf-8");
      const output = mergeReplacements(JSON.parse(existing), replacements);
      await writeFile(args.outFile, JSON.stringify(output, null, 2));
      const totalReplacements = sumBy(
        Object.entries(replacements),
        ([_, v]) => v.length
      );
      console.log(totalReplacements, "new replacements added to", args.outFile);
    }
  )
  .command(
    "suggest",
    "Suggest pending replacements",
    {
      cwd: { desc: "Target directory", default: "." },
      outFile: {
        desc: "Output suggestions file path",
        default: "patches/manualReplacements.json",
      },
    },
    async (args) => {
      const replacements = await findPendingReplacements({ dir: args.cwd });
      if (Object.keys(replacements).length === 0) {
        console.log("No replacements needed");
        return;
      }
      const existing = await readFile(args.outFile, "utf-8");
      const output = mergeReplacements(JSON.parse(existing), replacements);
      await writeFile(args.outFile, JSON.stringify(output, null, 2));
      const totalReplacements = sumBy(
        Object.entries(replacements),
        ([_, v]) => v.length
      );
      console.log(totalReplacements, "new replacements added to", args.outFile);
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();
