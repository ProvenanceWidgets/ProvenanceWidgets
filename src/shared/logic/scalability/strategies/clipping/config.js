import {
    DEFAULT_AGGREGATE_STRATEGY,
    DEFAULT_TEMPORAL_STRATEGY,
} from "../../shared/defaults.js";

/** CSS pixels per record (or second for time) in the default threshold. */
export const CLIPPING_PIXELS_PER_RECORD = 10;

export function resolveClippingConfig(scalability, { view = "temporal_view", width = 0 } = {}) {
    const options = scalability?.[view];
    const strategy = options?.strategy ?? (view === "aggregate_view"
        ? DEFAULT_AGGREGATE_STRATEGY : DEFAULT_TEMPORAL_STRATEGY);
    const enabled = strategy === "clipping";
    const trigger = enabled ? options?.clipping_options?.trigger ?? {} : {};
    const configuredThreshold = Number(trigger.threshold);
    const measuredWidth = Number(width);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0
        ? Math.max(1, Math.floor(configuredThreshold))
        : Number.isFinite(measuredWidth) && measuredWidth > 0
            ? Math.max(1, Math.floor(measuredWidth / CLIPPING_PIXELS_PER_RECORD))
            : null;
    return {
        view,
        strategy,
        enabled,
        // Wait for layout when an explicit threshold is not supplied.
        ready: enabled && threshold !== null,
        triggerType: trigger.type === "time" ? "time" : "interaction",
        threshold,
    };
}
