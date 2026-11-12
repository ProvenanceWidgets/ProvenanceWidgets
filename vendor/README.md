# Vendored source

This directory contains third-party source maintained with the project. The
[Savitzky–Golay adapter](../src/shared/logic/scalability/strategies/smoothing/savgol.js)
exposes `method.options.window_size` (default 5) and `method.options.degree`
(default 3), mapping them to the upstream `M` and `N` parameters.

## Sources

| Source | Repository | Imported commit | Local changes |
| --- | --- | --- | --- |
| js-savgol-filter | https://github.com/gorlang/js-savgol-filter | 3effaa558c0f032b84611f0969bbec2c1add5c7d | Relative import of adjacent jl-array1 source; algorithm unchanged |
| jl-array1 | https://github.com/gorlang/jl-array1 | bc81707812d306d1d9dc43d5d7af7febc53cd62c | None |

`package.json` declares CommonJS for these upstream modules, while the main project
uses ES modules. It establishes module scope, not a separately installed project.
Install dependencies from the repository root using its package lock; do not run
`npm install` inside the vendored source directories. The root package supplies
`ml-matrix`, which is bundled for browser/ESM builds to avoid dynamic `require`.

## Updating sources

For an initial import into empty directories, clone the upstream repositories:

```sh
git clone https://github.com/gorlang/js-savgol-filter.git vendor/js-savgol-filter
git clone https://github.com/gorlang/jl-array1.git vendor/jl-array1
git -C vendor/js-savgol-filter rev-parse HEAD
git -C vendor/jl-array1 rev-parse HEAD
```

Record full commit IDs before local changes. Existing populated directories cannot
be used as clone destinations. Preserve upstream README files, authorship, and
license information. The imported package manifests declare MIT but contain no
separate LICENSE file; do not substitute this project's license or invent an
upstream copyright statement. Preserve any LICENSE supplied by future imports.

After recording the source revisions, remove only the nested `.git` directories
inside the two imported folders, keeping the project root `.git`. The sources
are tracked directly, rather than as nested repositories or submodules.

Maintain this local import in `js-savgol-filter/js-savgol-filter.js`:

```js
const {Array1} = require('../jl-array1/jl-array1.js');
```

This replaces `require('jl-array1')`. No change to the upstream package's
`"jl-array1": "file:../jl-array1"` dependency is needed because installation uses
the root package. Record any further local changes in the table above.

## Adapter contract

Widgets use the adapter instead of importing the third-party filter directly:

```js
new SavgolFilter((window_size - 1) / 2, degree - 1)
```

`window_size = 2*M+1` and `degree = N+1`; degree 3 fits a quadratic. The previous
`window_length`, `polyorder`, and direct `M`/`N` options are no longer supported.
The window must be an odd integer at least 3, with positive integer degree smaller
than the window. Invalid combinations or histories shorter than the window return
the original samples without resizing the window. The first M+1 and last M samples
retain their original values, preserving upstream boundary behavior.

After updates, recheck source revisions, relative imports, parameter constraints,
and boundaries, then run:

```sh
npm run verify
```
