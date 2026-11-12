import { buildSelectionTimelineBars } from "../../../selectionTimeline.js";

/** Convert a selection widget's provenance domain to an interaction count. */
export function getSelectionInteractionCount(provenance) {
    return provenance?.domain?.get?.("index")?.[1] ?? 0;
}

/** Convert selection records into the clipped temporal timeline contract. */
export function buildClippedSelectionBars(options) {
    return buildSelectionTimelineBars(options).filter(bar =>
        bar.visibleMax > bar.visibleMin &&
        bar.endValue > bar.visibleMin &&
        bar.startValue < bar.visibleMax
    );
}

/** Convert a pointer position to the corresponding visible timeline bar. */
export function findClippedSelectionBar(bars, clientX, bounds) {
    if (!bounds || !Number.isFinite(clientX) || bounds.width <= 0) return null;
    const x = clientX - bounds.left;
    if (x < 0 || x > bounds.width) return null;
    return [...bars].reverse().find(bar => {
        const left = bounds.width * bar.left / 100;
        const right = Math.min(bounds.width, left + Math.max(bar.width === 0 ? 1 : 0, bounds.width * bar.width / 100));
        return x >= left && x <= right;
    }) ?? null;
}

/** Convert a bar hit to a valid provenance restore point. */
export function getClippedSelectionRestorePoint(bar, pointerRatio = null) {
    const point = Number.isFinite(pointerRatio)
        ? bar.visibleMin + Math.max(0, Math.min(1, pointerRatio)) * (bar.visibleMax - bar.visibleMin)
        : Math.max(bar.startValue, bar.visibleMin);
    return Math.max(bar.visibleMin, bar.startValue,
        Math.min(point, bar.visibleMax, bar.endValue));
}
