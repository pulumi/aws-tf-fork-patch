#!/usr/bin/env node

import { resolve } from "path";
import { access } from "fs/promises";
import { constants } from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { PatchContext } from "./config";
import { applyTagsAll } from "./patches/tags_all";

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
      await applyTagsAll(config);
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();
