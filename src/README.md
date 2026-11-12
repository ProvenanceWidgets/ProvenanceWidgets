# Source layout

[Project README](../README.md)

- [`widgets`](./widgets): public React widgets and provenance views.
- [`provenance`](./provenance): the provider and hooks that connect React widgets to core.
- [`shared`](./shared): private, reusable implementation details.
- [`types`](./types): public TypeScript contracts.
- [`web-components`](./web-components): custom-element wrappers around the React widgets.

[index.ts](./index.ts) is the package's React and TypeScript entry point.
[web-components/index.tsx](./web-components/index.tsx) is the custom-element entry
point. Shared logic remains private unless explicitly exported by an entry point.
