# AWS TF Fork Patcher

Applies a set of automated changes to a AWS TF fork working directory.

1. `yarn` - restore packages
2. `yarn apply --cwd [DIR]` - apply patches to a directory

## Design Notes

- Consider failure cases:
  1. Worst case is replacing something we shouldn't.
  2. Second worst is missing a replacement without warning.
  3. Throwing an error due to an unexpected scenario is a good outcome.
- Instruct the user how to fix the issue in the patcher.
- Aim for patches to be idempotent. Re-applying a patch multiple times should have no adverse effects.

## Generating replacements from diffs

1. Generate a diff `git diff v4.35.0..upstream-v4.35.0 > upstream.patch`
2. Convert diff to replacements `yarn start parse-patch upstream.patch --outFile patches/patchReplacements.json`
3. Copy output `patchReplacements.json` into `patches/replace_docs_terraform.ts`

Approximate method:

Parse diff for `website/docs` files (ignore renames and `internal/service`)

1. Find diffs where the same line has a removal and addition (rewrite). Create replacements for where "terraform" or "hashicorp" has been removed.
2. Find diffs where a single note has been removed.
3. Find diffs where a block of text has been removed.
