# types

[Source layout](../README.md) · [Project README](../../README.md)

- [`components.ts`](./components.ts): public props and types for React widgets.
- [`provenance.ts`](./provenance.ts): shared provenance types and common widget props.
- [`scalability.ts`](./scalability.ts): reusable scalability configuration objects and
  trigger/strategy types.

The contracts are re-exported from [src/index.ts](../index.ts). A declared option
does not imply that every widget implements it.
Runtime defaults are resolved in each [strategy](../shared/logic/scalability/strategies) configuration module.
