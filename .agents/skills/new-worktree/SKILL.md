---
name: new-worktree
description: Create a task worktree from the current branch, link dependencies, copy environment files, and run database migrations. Use only when explicitly invoked.
---

# New Worktree

Create an isolated worktree for a task in this repository. This skill is manual-only: do not invoke it from an inferred request or as part of another workflow.

## Input and confirmations

- Accept the task name as the skill input.
- If no task name was provided, infer one only when the intended task is obvious. Show the inferred name and ask the user to confirm it before doing anything. Otherwise ask the user for the task name.
- Convert the confirmed task name into a slug: lowercase, remove accents, replace every run of non-ASCII-alphanumeric characters with `-`, collapse repeated hyphens, and trim hyphens. Refuse an empty slug.
- If the repository is in detached HEAD, or the current branch cannot be determined, stop and ask the user which parent branch to use.
- Before creating anything, inspect `git status --short --untracked-files=all`. If untracked files exist, list them and ask whether they must be copied to the new worktree. Do not proceed until the user answers. Copy them only if the user confirms; preserve their relative paths.

## Creation workflow

Run every step from the repository root and stop immediately on the first failure. Do not continue after a failed command and do not silently delete or repair a partially created worktree; report the exact failed operation and target to the user.

1. Read the current branch as the parent branch. The new branch must be exactly the slug.
2. Set the target to `../gfinances.worktree/{slug}`. Resolve it relative to the repository root and refuse the operation if the target already exists or if a local branch with the slug already exists.
3. Create the worktree and branch from the current branch with `git worktree add -b "{slug}" "../gfinances.worktree/{slug}" "{parent_branch}"`.
4. Create a symbolic link at `{worktree}/node_modules` pointing to the source repository's `node_modules`. If the source `node_modules` does not exist, stop and report the failure.
5. Copy environment files from the source repository into the worktree, preserving relative paths. Include files named `.env` and `.env.*` (including ignored files); never copy `.git` or anything outside the repository. Do not overwrite an existing destination file.
6. If the user confirmed copying untracked files, copy those files now, preserving relative paths and refusing to overwrite files already present in the worktree.
7. From the new worktree, run `npm run db:migrate`. Do not substitute another migration command unless the user explicitly directs it.

If any preflight check, worktree creation, symlink, copy, or migration fails, stop and tell the user what succeeded, what failed, and the path/branch involved. Only after all steps succeed, report the absolute worktree path, branch name, parent branch, linked dependency path, copied environment/untracked files, and migration result.
