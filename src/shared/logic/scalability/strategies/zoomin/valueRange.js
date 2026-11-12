/**
 * Convert a horizontal brush selection to a snapped numeric domain range.
 * The step argument must match the widget's user-facing value control.
 */
export const brushSelectionToValueRange = (
    selection,
    width,
    min,
    max,
    step = 1
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        max <= min
    ) return null;

    const start = Math.max(0, Math.min(width, Math.min(...selection)));
    const end = Math.max(0, Math.min(width, Math.max(...selection)));
    const span = max - min;
    const normalizedStep = Number.isFinite(step) && step > 0 ? step : 1;
    const snap = value =>
        min + Math.round((value - min) / normalizedStep) * normalizedStep;
    const rangeMin = Math.max(
        min,
        Math.min(max, snap(min + (start / width) * span))
    );
    const rangeMax = Math.max(
        rangeMin,
        Math.min(max, snap(min + (end / width) * span))
    );
    return [rangeMin, rangeMax];
};
