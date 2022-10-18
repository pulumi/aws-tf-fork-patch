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
