/** Slider windows use absolute values and domain spans, never item indices. */
export function resolveSliderAggregateWindowConfig({ scalability, min, max }) {
    const options = scalability?.aggregate_view?.window_options;
    const domainValid = Number.isInteger(min) && Number.isInteger(max) &&
        max > min && Number.isFinite(max - min);
    const floor = Number.isFinite(min) ? min : 0;
    const span = domainValid ? max - min : 0;
    const size = Number.isInteger(options?.window_size) && options.window_size > 0
        ? Math.min(span, options.window_size)
        : span;
    const requestedStart = Number.isInteger(options?.window_start)
        ? options.window_start
        : floor;
    const maxStart = domainValid ? max - size : floor;

    return {
        min: floor,
        max: domainValid ? max : floor,
        size,
        requestedStart,
        start: Math.min(maxStart, Math.max(floor, requestedStart)),
        maxStart,
        enabled: domainValid && size > 0 && size < span,
    };
}
