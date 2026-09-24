# Respond Canvas

A flow chart editor for customer conversation workflows, built for the Respond.io frontend assessment.

**Live:** https://respond-canvas.vercel.app

## Run it

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev
```

Checks:

```sh
npm run typecheck
npm run test:run                  # unit and composable tests
npm run build && npm run test:e2e # Playwright against the production build
```

## Features

- **Canvas.** Renders `payload.json` with Vue Flow. Nodes are draggable.
- **Create.** "Create New Node", pick where the step goes, then set title, description and type (Send Message, Add Comment, Business Hours). Business Hours adds its Success and Failure branches.
- **Details drawer.** Opens on click or at `/nodes/:id`. Title and description edit inline. Send Message shows texts and attachment tiles and accepts uploads. Add Comment edits the comment. Business Hours uses time pickers and a timezone search. Success and Failure are view only.
- **Delete.** From the drawer, or hover a node and use the trash button. Deleting a step also removes the steps after it, after a confirmation.
- **Readiness.** The header badge lists what is incomplete. Each issue opens the step or adds the missing one.
- **Undo and redo** for moves, edits, inserts and deletes (`⌘Z` / `⇧⌘Z`).
- **Keyboard.** Nodes are focusable. Enter opens, Delete removes, Escape closes.

## Performance

The editor stays fast on large workflows. Measured on a generated 1,000 node workflow, before and after the performance pass:

| Action | Before | After | Components re-rendered (before → after) |
|---|---|---|---|
| Initial load | 2.8 s | **1.5 s** | 1,000 nodes rendered → 28 (visible only) |
| Edit a title | 787 ms | **62 ms** | 3,002 → 11 |
| Drag a node | 1,250 ms | **344 ms** | 3,076 → 100 |
| Delete a step | 1,036 ms | **265 ms** | 2,995 → 0 |
| Insert a step | 3,354 ms | **316 ms** | 15,138 → 12 |

Times are wall clock in Chromium on the dev build, including dialog and drawer animations. Re-render counts are node and edge components, taken from Vue's own component update events.

What changed:

- **Only changed nodes re-render.** Each node and edge keeps the same view object while its inputs are unchanged, so Vue skips it.
- **Vue Flow gets changes, not a new array.** Replacing its node array rebuilt its lookup and re-rendered every edge. The canvas now sends only the added, removed and updated nodes.
- **No full scans.** One index per graph version replaces repeated searches. Inserting moves only the downstream steps instead of re-running the whole layout.
- **Readiness is cached per node,** so an edit re-validates one node, not all of them.
- **Only visible nodes are rendered.** The trade-off is that Tab reaches visible nodes only; when the app moves focus, it pans to the node first.

## Stack

Vue 3, Vite, TypeScript, Vue Flow, TanStack Query, Pinia, Vue Router, Zod, shadcn-vue with Tailwind 4. Vitest with Testing Library, Playwright.

## Architecture

Functional Core, Imperative Shell, organised by feature.

```
src/features/workflow/
  domain/        pure logic: parse, validate, insert, delete, layout, history
  composables/   the shell: Query, Pinia, router, view models
  components/    render view models and forward events, no state
  stores/        Pinia: editor mode, undo history
  data/          loads payload.json
```

- The domain never imports Vue. Every change is a function from a graph to a new graph. It never mutates and never throws: it returns `{ ok: true, value }` or `{ ok: false, errors }`.
- Composables own all state and call the domain. Components only bind what composables expose.
- Errors carry a field path such as `['config', 'hours', 2]`, so every error lands next to its field through one lookup.

Further reading on the pattern: [Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell).

## Design decisions

- **TypeScript instead of plain JavaScript.** It compiles to ES modules and types the payload boundary and every domain result.
- **Query owns the graph, Pinia owns editor state.** The brief asks for Query for fetching and mutations, so the graph lives in the Query cache with the required config. Pinia holds insertion mode and the undo history. There is one copy of the graph and nothing to keep in sync.
- **Local copy of the payload.** The S3 file sends no CORS headers, so an exact copy is served as `/payload.json`.
- **Edits stay in memory.** Refreshing restores the sample workflow.
- **The trigger is only deletable from its drawer,** since deleting it removes the whole workflow.
- **Node type is a radio card group, not a select,** so all three options and their descriptions are visible at once.
- **Undo is disabled while the drawer or a dialog is open,** so unsaved drawer edits are never discarded.

## Tests

- **Domain:** unit tests, no mocks.
- **Composables:** integration tests through the real editor with Query, Pinia and the router. Only the repository is stubbed.
- **Components:** interaction tests for the drawer, node card and page.
- **End to end:** Playwright covers keyboard editing, deep links and insertion.

## CI/CD

GitHub Actions runs typecheck, unit tests, build and Playwright on every push and pull request. Deploys to Vercel only when those pass: previews for pull requests, production for `main`.
