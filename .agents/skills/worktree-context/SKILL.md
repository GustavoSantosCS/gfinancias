---
name: worktree-context
description: Decide whether code changes stay in the current task worktree or require a new context, invoking new-worktree when needed.
---

# Worktree Context

All code changes must happen inside a task worktree. Use the current task worktree when the requested change belongs to its existing scope. Create a new worktree only when the request changes context or creates an independent deliverable.

Before editing any file, identify the current worktree and compare the requested objective with the active task. If the current checkout is the repository's primary checkout rather than a task worktree, invoke `new-worktree` for the task before making code changes.

## Create a new worktree

Invoke `new-worktree` before editing when any of these conditions applies:

- The user asks the agent to execute a plan.
- The user asks to increase test coverage for the whole project. Increasing coverage within the current functionality stays in the current worktree.
- The requested change is outside the active task's scope.
- The user asks for an unrelated feature, bug fix, refactor, documentation change, or infrastructure change.
- A bug found during the task also affects other flows.
- The operation presents conflicts that need to be resolved, except for small conflicts while merging the current task.
- The user asks for an independent audit, investigation, experiment, prototype, or alternative implementation.
- A shared-code refactor is larger than the small-change threshold: use the current context for fewer than two files; create a new context for two or more files.

When one of these conditions applies, do not edit the current worktree first. Invoke `new-worktree` with the task name and wait for its completion. Continue the requested work only in the new worktree.

## Keep the current worktree

Do not create another worktree when the requested change remains part of the active task, including:

- Adding or changing tests for the current functionality.
- Fixing a defect discovered while implementing the current task when it does not become a separate cross-flow bug.
- Changing the database and backend together as required by the current functionality.
- Updating dependencies required by the current functionality.
- Performing security, performance, accessibility, responsive, or UI review limited to the current functionality.
- Resolving a small conflict while merging the current task.
- Changing shared configuration, theme, schema, or base components as a small or necessary part of the current task.
- Fixing lint, formatting, type, build, or test failures caused by the current task.
- Updating documentation or running validation for the current task.

Do not create a worktree for read-only investigation, status/diff inspection, tests, lint, type checking, builds, commits, or other operations that do not change code.

## Decision rule

Ask the user before editing when the scope cannot be determined from the request and current task. Explain the two possible scopes briefly. Never silently expand the active task to absorb an unrelated request.

Use this order:

1. Same objective and same feature flow: stay in the current task worktree.
2. Separate objective or cross-flow impact: invoke `new-worktree`.
3. Genuine ambiguity: ask the user before changing files.

The `new-worktree` skill owns task-name confirmation, slug generation, parent-branch selection, untracked-file handling, environment-file copying, dependency linking, migration execution, and failure reporting. Do not duplicate or bypass that workflow.
