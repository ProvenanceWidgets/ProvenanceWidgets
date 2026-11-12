# Scalability Development Guide

[Source layout](../../../README.md)

Scalability code is organized by strategy. Each strategy owns its configuration,
trigger decisions, algorithms, and view-specific adaptation. Modules remain
independent from React and browser rendering.

## Structure

```text
scalability/
├── index.js                 # Stable shared entry point for widget consumers
├── strategies/
│   ├── clipping/            # Rolling history windows and hidden-record notices
│   │   ├── README.md
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── trigger.js
│   │   └── ...              # Record/selection projections and axis helpers
│   ├── smoothing/           # Numerical curves for temporal and aggregate views
│   │   ├── README.md
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── trigger.js
│   │   ├── adapters/
│   │   └── ...              # Savgol, Gaussian, B-spline, and view resolvers
│   └── zoomin/              # Interaction, value, and rectangle zoom
│       ├── README.md
│       ├── index.js
│       ├── config.js
│       └── ...              # Visibility, automatic zoom, and geometry
├── shared/
│   └── defaults.js         # Defaults reused by zoom and smoothing
└── windowing/               # Aggregate scrolling, independent of strategy
    ├── README.md
    ├── config.js
    └── sliderAggregateWindow.js
```

| Directory | Public configuration value | Behavior |
| --- | --- | --- |
| No strategy module | `none` | Keep the unmodified view without zoom, clipping, or smoothing |
| [clipping](strategies/clipping/README.md) | `clipping` | Limit displayed history while preserving source records |
| [smoothing](strategies/smoothing/README.md) | `smoothing` | Replace dense slider marks with display-only curves |
| [zoomin](strategies/zoomin/README.md) | `zoom_in` | Select an interaction, value, or two-dimensional region |

The directory name `zoomin` does not change the existing `strategy: "zoom_in"`
API. Aggregate views default to `none`; temporal views default to `zoom_in`.
[Windowing](windowing/README.md) is independent of strategy: it controls a
Slider's aggregate viewport independently of the selected strategy.

## Implementation rules

1. Keep configuration parsing in the strategy's `config.js`. Algorithms consume
   normalized inputs rather than raw `scalability` objects.
2. Keep trigger decisions separate from rendering. Widgets decide how to display
   the result; logic modules must not import React, browser globals, or widgets.
3. Keep temporal and aggregate adaptation within the owning strategy. Place
   reusable data conversion in its adapters rather than in widget renderers.
4. Put genuinely shared defaults or utilities in `shared/`. Avoid importing one
   strategy's implementation from another strategy.
5. Export consumer-facing helpers from the strategy's `index.js`; the top-level
   `index.js` re-exports these names. Internal modules import their dependencies
   directly to avoid circular imports through entry points.
6. Keep temporal and aggregate configuration independent and preserve source
   history. Add focused regression coverage when changing behavior or defaults.

Dependency flow is shared defaults → configuration/algorithms → view adaptation
→ widget rendering. Entry points only collect exports; they do not dispatch
strategies or contain rendering decisions.

## Maintenance and validation

When changing a strategy, update its README. Confirm widget integration
separately from the presence of shared algorithms or types.

Run `npm run verify` from the repository
root. See [project commands](../../../../README.md#development) for their scope.
