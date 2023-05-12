#!/usr/bin/env node

import { resolve } from "path";
import { access, readFile, writeFile } from "fs/promises";
import { constants, existsSync } from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { PatchContext } from "./config";
import * as patches from "./patches";
import { parseGitPatch } from "./parseGitPatch";
import { extractDocsReplacements } from "./extractDocsPatch";
import { findPendingReplacements } from "./findPendingReplacements";
import { mergeReplacements } from "./mergeReplacements";
import { sumBy } from "array-fns";
import { execSync } from "child_process";
import { EOL } from "os";

const PatcherIgnoresPathDefault = ".patcher-ignores";
yargs(hideBin(process.argv))
  .command(
    "replace",
    "Apply docs replacements onto working directory",
    {
      cwd: { desc: "Target directory", default: "." },
      replacements: {
        desc: "Replacements source file path",
        default: "replacements.json",
      },
      target: {
        desc: "Glob of paths to be checked for replacements",
        default: "website/**/*.markdown",
      },
      ignoresFile: {
        desc: "Ignore file path",
        default: PatcherIgnoresPathDefault,
      },
    },
    async (args) => {
      const config = await parseConfig(args);
      const ignores = await readIgnores(
        args.ignoresFile,
        args.ignoresFile !== PatcherIgnoresPathDefault
      );

      // Apply manual replacements - anything the automated steps can't handle
      // These are generated using the suggest command
      await patches.applyDocsReplacements(
        config,
        args.target,
        args.replacements,
        ignores
      );
    }
  )
  .command(
    "global-replace",
    "Apply global replacements onto working directory",
    {
      cwd: { desc: "Target directory", default: "." },
      replacements: {
        desc: "Global replacements source file path",
        default: "global-replacements.json",
      },
      ignoresFile: {
        desc: "Ignore file path",
        default: PatcherIgnoresPathDefault,
      },
    },
    async (args) => {
      const config = await parseConfig(args);
      const ignores = await readIgnores(
        args.ignoresFile,
        args.ignoresFile !== PatcherIgnoresPathDefault
      );
      await patches.globReplace(config, args.replacements, ignores);
    }
  )
  .command(
    "strip-links",
    "Remove links to disallowed sources",
    {
      cwd: { desc: "Target directory", default: "." },
      domains: {
        desc: "Domain rules path",
        default: "domains.json",
      },
    },
    async (args) => {
      const config: PatchContext = await parseConfig(args);
      const domains = await patches.readDomains(args.domains);
      await patches.applyStripDocLinks(config, domains);
    }
  )
  .command(
    "apply",
    "Apply AWS TF fork patches onto working directory",
    {
      cwd: { desc: "Target directory", default: "." },
      "pre-automated-replacements": {
        desc: "Output replacement file path. Defaults to pre-replacements.json if it exists",
        type: "string",
      },
      replacements: {
        desc: "Replacements source file path",
        default: "replacements.json",
      },
      "skip-link-stripping": {
        desc: "Disable auto-stripping of links from docs",
        type: "boolean",
        default: false,
      },
      "skip-gofmt": {
        desc: "Disable auto-formatting after edits",
        type: "boolean",
        default: false,
      },
      domains: {
        desc: "Domain rules path for link stripping",
        default: "domains.json",
      },
    },
    async (args) => {
      const config = await parseConfig(args);
      // Fix tags_all fields
      await patches.applyTagsAll(config);
      const defaultPreAutomatedReplacementsPath = "pre-replacements.json";
      if (args.preAutomatedReplacements === undefined) {
        if (existsSync(defaultPreAutomatedReplacementsPath)) {
          args.preAutomatedReplacements = defaultPreAutomatedReplacementsPath;
        }
      }
      if (args.preAutomatedReplacements !== undefined) {
        // Special set of replacements derived from the original git diff
        await patches.applyDocsReplacements(
          config,
          "website/**/*.markdown",
          args.preAutomatedReplacements,
          ["website/docs/index.html.markdown"]
        );
      }
      // Auto-strip TF & relative links
      if (!args.skipLinkStripping) {
        const domains = await patches.readDomains(args.domains);
        await patches.applyStripDocLinks(config, domains);
      }
      // Apply manual replacements - anything the automated steps can't handle
      // These are generated using the suggest command
      await patches.applyDocsReplacements(
        config,
        "website/**/*.markdown",
        args.replacements,
        ["website/docs/index.html.markdown"]
      );
      // Apply overlays last as they shouldn't be modified
      await patches.applyOverlays(config);
      if (!args.skipGofmt) {
        // Reformat internal code
        await patches.applyGoFmt(config);
      }

      // Generate replacements
      // Format replacements
      // TODO: make better suggestions - e.g. 3 words each side
      // TODO: Apply replacements ignoring line breaks
    }
  )
  .command(
    "check",
    "Check for pending replacements",
    {
      cwd: { desc: "Target directory", default: "." },
      "replacements-path": {
        desc: "Path to replacements file to append to",
        default: "replacements.json",
      },
      "write-to-stdout": {
        desc: "Write new replacements to stdout instead of merging them to the replacements-path",
        type: "boolean",
        default: false,
      },
    },
    async (args) => {
      const config = await parseConfig(args);
      const replacements = await findPendingReplacements(config);
      if (Object.keys(replacements).length === 0) {
        console.log("No replacements needed");
        return;
      }
      const existing = await readFile(args.replacementsPath, "utf-8");
      if (args.writeToStdout) {
        console.log(JSON.stringify(replacements, null, 2));
      } else {
        const output = mergeReplacements(JSON.parse(existing), replacements);
        await writeFile(
          args.replacementsPath,
          JSON.stringify(output, null, 2) + EOL
        );
        const totalReplacements = sumBy(
          Object.entries(replacements),
          ([_, v]) => v.length
        );
        console.log(
          totalReplacements,
          "new replacements added to",
          args.replacementsPath
        );
        console.log(
          `Search for "TODO" and substitute for an appropriate replacement.`
        );
      }
    }
  )
  .command(
    "adopt",
    "Adopt changes from working directory. Supports line replacements and deletions.",
    {
      cwd: { desc: "Target directory", default: "." },
      "replacements-path": {
        desc: "Path to replacements file to append to",
        default: "replacements.json",
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
      const existing = await readFile(args.replacementsPath, "utf-8");
      const output = mergeReplacements(JSON.parse(existing), replacements);
      await writeFile(
        args.replacementsPath,
        JSON.stringify(output, null, 2) + EOL
      );
      const totalReplacements = sumBy(
        Object.entries(replacements),
        ([_, v]) => v.length
      );
      console.log(
        totalReplacements,
        "new replacements added to",
        args.replacementsPath
      );
    }
  )
  .command(
    "format",
    "Sort and de-duplicate a replacements file",
    {
      "replacements-path": {
        desc: "Path to replacements file to format",
        default: "replacements.json",
      },
    },
    async (args) => {
      const existing = await readFile(args.replacementsPath, "utf-8");
      const output = mergeReplacements(JSON.parse(existing), {});
      await writeFile(
        args.replacementsPath,
        JSON.stringify(output, null, 2) + EOL
      );
    }
  )
  .command(
    "parse-patch [file]",
    "Parse a patch file",
    {
      "patch-path": { desc: "Patch file path", type: "string", demand: true },
      "replacements-path": {
        desc: "Path to replacements file to format",
        default: "replacements.json",
      },
    },
    async (args) => {
      const content = await readFile(args.patchPath, "utf-8");
      const patch = parseGitPatch(content);
      const replacement = extractDocsReplacements(patch);
      await writeFile(
        args.replacementsPath,
        JSON.stringify(replacement, null, 2)
      );
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();

async function parseConfig(args: { cwd: string }) {
  const dir = resolve(args.cwd);
  // Fail fast if we don't have access
  await access(dir, constants.W_OK | constants.R_OK);
  const config: PatchContext = {
    dir,
  };
  return config;
}

async function readIgnores(
  ignoresFile: string,
  require: boolean
): Promise<string[]> {
  const exists = existsSync(ignoresFile);
  if (!exists) {
    if (require) {
      throw new Error(`Ignore file not found at path: ${ignoresFile}`);
    } else {
      return [];
    }
  }
  const file = await readFile(ignoresFile, "utf-8");
  const lines = file.split(EOL);
  return lines;
}
