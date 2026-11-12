# Display clipping for widgets

[Source layout](../../../../../README.md)

All seven widgets share temporal and aggregate clipping: `CheckboxGroup`, `RadioGroup`,
`SingleSelectDropdown`, `MultiSelectDropdown`, `InputText`, `Singleslider`, and
`Rangeslider`. Temporal and aggregate views are configured independently.

```jsx
const scalability = {
  temporal_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "interaction", threshold: 20 },
    },
  },
};

<RadioGroup scalability={scalability} {...props} />
```

Each widget can receive its own object. Each view uses only its own configuration;
configure `aggregate_view` explicitly to clip aggregate history. An omitted view
uses its default behavior. Neither view inherits the other's strategy, trigger,
or threshold.

## Rolling window behavior

- `type` defaults to `interaction`.
- `threshold` is a positive integer. When omitted or invalid it defaults to
  `max(1, floor(widgetWidth / 10))`, using the widget's CSS pixel width. The hook
  waits for layout before applying this default and observes width changes.
- Interaction triggers count records with `kind: "interaction"`. Baseline and
  time-sampling records do not increase the count. One multi-selection change
  counts as one interaction, regardless of how many options changed.
- `time` measures elapsed **seconds in the recorded history**, including
  time samples. In `mode="time"`, the existing controller's sampling advances
  that span while idle; in interaction mode it advances when history changes.
  Importing old history does not count the wall-clock gap since it was recorded.
- After the threshold is exceeded, the window advances on every interaction.
  With threshold 10, total counts 15, 16, and 17 give bounds 5–15, 6–16,
  and 7–17. The left bound is the cutoff: at 15, the ten interactions 6–15
  contribute to aggregate statistics; temporal selection intervals can carry
  their existing state across the left edge.
- Time triggers keep the latest threshold seconds of recorded history.
- Imported history uses the same rolling window. Reaching an exact multiple
  of the threshold no longer clears the view.

## What changes on screen

Temporal clipping displays the current window without the legacy selection-widget
timeline. Temporal marks and aggregate bars remain visible and interactive.
For elapsed-time labels, use `mode="time"`; the trigger type still determines
whether the window covers interactions or recorded seconds.
SingleSlider and RangeSlider keep read-only interaction/time and value axes while
clipping is active. The interaction axis uses regular ticks for the currently
visible interaction range; clipping does not expose a zoom brush.

Aggregate statistics count only interactions inside the window. Selection
state at its left edge is retained to compute deltas, without being counted
as a new selection. Current widget values and full source history are preserved.

Checkbox, radio, single-select, multi-select, text input, single-slider, and range-slider
widgets show a white slashed eye at the footprint icon's bottom-right only when
records are hidden in the **displayed view**. The 16px graphite (`#343a40`) circular badge
has a 2px white border and an 11px white eye outline.
Aggregate clipping works independently of temporal zoom. Switching to a view
without hidden records hides the badge.
Hovering over the badge shows `1 record hidden` or `N records hidden`.
The badge does not toggle views and suppresses the footprint help tooltip while
hovered. The bubble hides when the pointer leaves the badge.
Time-based clipping also reports the number of hidden records.

Sliders retain their existing value-history points and aggregate bars, limited
to the active rolling window. For categorical drag-selection under the separate
`zoom_in` strategy, see [temporal zoom](../zoomin/README.md).

Text input uses the same active-view eye badge and hidden-record count as checkbox
groups. Repeated committed searches count as separate interactions; its text-specific
history and aggregate frequency adapters remain unchanged.

## Implementation

- `strategies/clipping/config.js`: shared view configuration and width default.
- `strategies/clipping/trigger.js`: threshold-boundary calculation.
- `strategies/clipping/clippingPeriod.js`: shared cutoff, cumulative counts, and axis labels.
- `strategies/clipping/recordTemporal.js`: text/numeric temporal records and axis positions.
- `strategies/clipping/recordAggregate.js`: text/numeric frequencies for the current period.
- `strategies/clipping/selectionTemporal.js`: display projections for aggregate and temporal.
- [useClippingBadge.js](../../../../hooks/useClippingBadge.js): active-view badge message for categorical
  widgets and sliders.
- [useSelectionTemporalScalability.js](../../../../hooks/useSelectionTemporalScalability.js): width measurement and brush
  state shared by all four widgets.

Components pass their records and `scalability` attributes into the shared
hook and render its display strategies. Source strategies stay registered for
export and restoration. Checkbox zoom uses a linear drag-selection brush;
threshold-based history compression has been removed.

Clipping is implemented entirely in the library's `src/` directory. Callers
choose the view configuration through `scalability`.
