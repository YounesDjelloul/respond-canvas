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
npm run test:e2e
```

## Architecture

The application uses Functional Core / Imperative Shell architecture inside feature boundaries.

- `domain/` contains pure payload normalization, validation, graph construction, and layout logic.
- `data/` owns access to the supplied payload.
- `composables/` coordinate TanStack Query and expose presentation-ready view models.
- `components/` render those view models and forward user interactions.

The workflow page provides one feature-scoped editor controller. Canvas and drawer components inject focused `status`, `canvas`, and `details` APIs from that controller, avoiding broad prop and event chains without promoting local editor state into a global store.

The transport payload is normalized into a consistent TypeScript model at the boundary. Mixed numeric and string IDs, transport-specific node names, and Business Hours represented as `dateTime` are not allowed to leak into the UI.

Expected domain failures use a shared coded `DomainResult` with structured error paths. Infrastructure exceptions bubble to application-shell boundaries: TanStack Query handles repository failures, while global Query, mutation, router, Vue, and unhandled-promise handlers provide centralized reporting.

The supplied S3 object does not expose browser CORS headers. An exact copy is therefore served as `/payload.json` and fetched through TanStack Query, keeping the deployment frontend-only and deterministic.

Workflow mutations intentionally remain in memory. Refreshing the page restores the supplied sample workflow.

Editable nodes open through route-addressable details drawers. Title and description updates replace the cached graph immutably. Deleting a node also deletes its descendants after an explicit confirmation. Display-only Success and Failure nodes cannot open the drawer.

Type-specific editors support ordered Send Message text and attachments, internal comments, and weekly Business Hours with timezone-aware schedules. Uploaded files are validated to 5 MB, represented as in-memory data URLs, and discarded on refresh with the rest of the editing session.

## Accessibility and motion

Interactive elements use semantic labels and visible focus indicators. Workflow nodes are keyboard-focusable from the first iteration. Motion uses short transitions and respects `prefers-reduced-motion`.
