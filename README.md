# Respond Canvas

A fast, accessible visual workflow editor built for the Respond.io frontend assessment.

## Setup

```sh
npm install
npm run dev
```

## Verification

```sh
npm run typecheck
npm run test:run
npm run build
```

## Architecture

The application uses Functional Core / Imperative Shell architecture inside feature boundaries.

- `domain/` contains pure payload normalization, validation, graph construction, and layout logic.
- `data/` owns access to the supplied payload.
- `composables/` coordinate TanStack Query and expose presentation-ready view models.
- `components/` render those view models and forward user interactions.

The transport payload is normalized into a consistent TypeScript model at the boundary. Mixed numeric and string IDs, transport-specific node names, and Business Hours represented as `dateTime` are not allowed to leak into the UI.

Expected domain failures use a shared coded `DomainResult` with structured error paths. Infrastructure exceptions bubble to application-shell boundaries: TanStack Query handles repository failures, while global Query, mutation, router, Vue, and unhandled-promise handlers provide centralized reporting.

The supplied S3 object does not expose browser CORS headers. An exact copy is therefore served as `/payload.json` and fetched through TanStack Query, keeping the deployment frontend-only and deterministic.

Workflow mutations intentionally remain in memory. Refreshing the page restores the supplied sample workflow.

## Accessibility and motion

Interactive elements use semantic labels and visible focus indicators. Workflow nodes are keyboard-focusable from the first iteration. Motion uses short transitions and respects `prefers-reduced-motion`.
