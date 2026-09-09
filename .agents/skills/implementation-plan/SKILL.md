---
name: implementation-plan
description: Create a complete implementation plan in Markdown for a request after checking open questions and iteratively reviewing the plan with a high-reasoning subagent. Invoke only when explicitly requested with $implementation-plan.
---

# Implementation plan

Use this skill only after an explicit manual invocation. It creates a plan for an implementation agent that has no prior conversation context. It does not implement the requested change.

## 1. Check for open questions first

Before writing any plan, inspect the request and the repository context needed to understand it. Look for ambiguity that could change implementation, such as missing business rules, unclear scope, incompatible acceptance criteria, unknown target platform, absent source of truth, or a required choice between materially different designs.

If any such point exists, stop. Tell the user that there are open points, list them as a short, plain Markdown list, and ask the user to resolve them before the plan is created. Do not invent decisions to make the plan appear complete. Minor implementation choices that do not change the requested outcome should be chosen by the agent and recorded as assumptions in the plan.

## 2. Create the first plan

When no blocking question remains, investigate the relevant repository files, local instructions, domain documentation, existing tests, and available scripts. Preserve unrelated user changes. The plan must be Markdown and must be self-contained for an agent with no access to this conversation.

Write the plan to the repository's established plans directory when one exists. Otherwise use `implementation-plan.md` at the repository root. Do not commit the Markdown file unless the user explicitly authorizes it.

The plan must include, in a practical order:

- the requested outcome and user-visible behavior;
- confirmed context and explicit assumptions;
- scope, non-goals, and dependencies;
- relevant current implementation, with paths and the behavior that must be preserved;
- an ordered implementation sequence with precise files, responsibilities, data flow, and edge cases;
- database, API, backend, frontend, and shared-package changes when applicable;
- integration-first tests, fixtures, test data, and exact acceptance scenarios;
- commands for validation and expected results;
- rollout, migration, compatibility, and failure handling when applicable;
- acceptance criteria that can be checked without relying on this conversation.

Use direct explanations. Do not rely on opaque issue numbers, unexplained abbreviations, prior messages, or an implied understanding of the codebase. Name concrete files and observable behaviors so the implementing agent can execute the plan exactly.

## 3. Review loop

After the first draft, review it with one independent subagent using high reasoning effort. Give the reviewer the original request, the relevant repository evidence, and the complete draft, but do not tell it what problems to find. Ask it to check whether another agent could implement the request exactly and to classify every finding as `very high`, `high`, `medium`, or `low` severity.

For every `very high`, `high`, or `medium` finding, correct the plan immediately. Keep low-severity findings in a dedicated Markdown section named `Low-severity findings`, including the finding, its impact, and whether it needs user direction.

Repeat the review-and-correction cycle until the reviewer reports no `very high`, `high`, or `medium` findings, or until three review executions have occurred. A review execution means one subagent validation, including a validation that returns no findings. Do not exceed three executions.

If the third execution still reports a `very high`, `high`, or `medium` finding, tell the user that the review limit was reached and list the unresolved findings. The plan is not ready for implementation until those findings are resolved; do not claim completion.

## 4. Finish

When no `very high`, `high`, or `medium` findings remain:

1. List every low-severity finding found during the loop. If there are any, ask the user what they want done with them; do not silently convert them into blocking questions.
2. Inform the user that the plan is complete and ready for implementation.
3. Include the path to the Markdown plan and a short note about validation performed.

If low-severity findings require no decision, the plan can still be marked ready; preserve them in the plan and mention that they remain intentionally unresolved.

## Reviewer prompt

Use a prompt equivalent to the following, adapting only the repository-specific details:

> Review this implementation plan against the original request and the supplied repository evidence. Assume the implementing agent has no other context. Find missing requirements, contradictions, unsafe assumptions, incorrect file or data-flow claims, incomplete error handling, missing integration tests, and acceptance criteria that cannot be verified. Classify each finding as very high, high, medium, or low severity. Be rigorous and report no finding when the plan is sufficient.
