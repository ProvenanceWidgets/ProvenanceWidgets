/** Keep the latest threshold-sized window; source history is untouched. */
export function getClippingBoundary({ metric, config }) {
    if (!config.ready || !Number.isFinite(metric)) return 0;
    return Math.max(0, metric - config.threshold);
}
