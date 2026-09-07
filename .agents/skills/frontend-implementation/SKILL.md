---
name: frontend-implementation
description: Build or change GFinanças frontend pages and reusable components with feature boundaries, complete UI states, tests, Storybook, themes, and accessibility.
---

# GFinanças frontend implementation

Use this skill when implementing or changing GFinanças frontend pages, feature components, or shared UI components. Read [the frontend architecture](../../../docs/arquitetura-frontend.md) before making structural decisions.

## Structure and data flow

- Use thin App Router routes: compose the page, define metadata, and delegate domain behavior to `apps/web/src/features/<domain>`.
- Keep domain components, hooks, schemas, and presentation utilities in their feature. Use the domains `overview`, `planning`, `cards`, `goals`, and `reserves`.
- Put generic visual components in `packages/ui`. They must not import financial features or domain rules.
- Access persisted data only through tRPC and TanStack Query. Do not access the database from the web application.
- Put selected month and year in the URL when they define the viewed data. Keep temporary UI state, such as dialogs and tabs, local to the smallest useful component.
- Keep monetary values in integer cents at the boundaries with the API. Reuse centralized money and date utilities.

## Page and component behavior

- Every server-backed page and component must handle loading, empty, error, and success states.
- Forms must expose field-level validation, prevent duplicate submissions, preserve entered values after a failed request, and provide mutation feedback.
- Use semantic tokens for colors and verify light and dark modes. Do not encode domain meaning only through color.
- Preserve keyboard access, visible focus, correctly associated labels and errors, and accessible dialog behavior.
- Design responsive behavior intentionally: controls wrap or scroll when necessary, and the sidebar works as an overlay on narrow screens.

## Verification and documentation

- Add meaningful integration tests for feature components and forms. Test observable behavior and domain-relevant outcomes rather than implementation details.
- Add API integration tests with isolated SQLite for every new server-backed flow, and cover financial rules directly when integration tests do not make a rule clear.
- Maintain at least 60% lines, statements, functions, and branches separately for frontend and backend. Do not lower existing coverage.
- Add Storybook stories for reusable components. Include relevant normal, loading, empty, error, light, dark, and responsive states.
- Run the relevant type checks, linting, application build, Storybook build, tests, E2E flow, and coverage checks before handing off a feature.
