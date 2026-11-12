# Aggregate Slider windows

[Source layout](../../../../README.md)

`Singleslider` and `Rangeslider` support `aggregate_view.window_options`
independently of the selected strategy:

```js
scalability: {
    aggregate_view: {
        window_options: { window_size: 20, window_start: 30 },
    },
}
```

For a 0–100 slider this initially displays 30–50. `window_size` is a positive integer
value span, independent of `step`; `window_start` is an absolute value, not an
index or an offset from `min`. For a 50–150 slider, a start of 70 displays 70–90.
Both parameters require integers. Scrolling rounds the local window start to an
integer and snaps the content into alignment after the gesture finishes. Window
endpoints display integers. Slider value selection still follows its own `step`.
Windowing requires integer `min` and `max`; fractional domains use the full view.

Omitted, noninteger, or nonpositive sizes show the complete domain. Sizes greater
than the domain are clamped to the complete domain. An omitted/invalid start
defaults to `min`; starts are clamped to `[min, max - window_size]`. A full-domain
view has no scrollbar. Other widget types do not implement windowing yet.

The viewport contains the entire slider, including aggregate bars, smoothing,
hitboxes, track, handles, and ticks. It has a native horizontal scrollbar below
the ticks. Endpoint padding leaves room for handles and short labels. Enabled
ticks label the visible window endpoints and visible handles; tick positions
and selectable values remain anchored to the original domain.

If the viewport's effective plot width is `V`, the content plot width is
`V * (max - min) / window_size`. The scroll offset is
`(window_start - min) * V / window_size`; endpoint padding is excluded from both.

Changing the configured `window_start` repositions the window. Ordinary renders,
provenance updates, and smoothing changes preserve the user's current scroll
position. Resizing the viewport or changing `window_size` preserves the current
left-edge value and clamps it if necessary. Re-enabling a window restores the
configured start. Configuration objects are never mutated. The effective start
is local view state; there is no new value-change callback for scrolling.

Scrolling does not change the selected value or record provenance. Values can
remain outside the viewport. Focusing a handle or using its keyboard controls
reveals it. The scroll region can also be focused to use native keyboard scrolling.
Tooltips and history restore actions retain their original value coordinates.

Clipping is computed before display, using the widget's viewport width for its
default threshold. Smoothing is computed over the complete value domain. Bar
heights and colors retain their full aggregate scales while browsing. The
temporal dropdown stays outside the scroll container and uses the widget width.

Each slider maintains its own user scroll position after configuration is applied.
