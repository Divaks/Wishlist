---
name: update-doc
description: Check and update Wishlist documentation after repository structure, features, contracts, or operational workflows change, or when asked to audit a commit for documentation impact.
---

1. Identify the task diff. For work in progress, inspect relevant staged,
   unstaged, and new files. For a commit audit, compare the requested commit
   with its parent, or use the requested base and head for a range.
2. Check whether the diff changes a fact a reader relies on, such as application
   layout, user behavior, API contracts, permissions, data, setup, commands or
   CI. If current docs still apply, report that and finish.
3. Use the [documentation index](../../../docs/README.md) to locate affected
   files. Verify current behavior against source, commands against package scripts
   or CI, and edge cases against relevant tests. Keep intended invariants and
   record any implementation gaps.
4. Update the affected canonical guide and any stale related README references.
   Preserve useful examples and setup instructions. Keep docs edits within the
   task scope. In review-only work, report stale docs as findings.
5. Check changed links, paths, command names and `git diff --check`. Report
   which docs changed or why no edits were needed. If auditing a completed
   commit, leave any docs edits available for a follow-up commit.
