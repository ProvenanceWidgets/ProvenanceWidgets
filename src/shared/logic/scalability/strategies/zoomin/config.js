import {
    DEFAULT_TEMPORAL_STRATEGY,
    DEFAULT_TEMPORAL_INTERACTION_THRESHOLD,
    DEFAULT_TEMPORAL_TIME_THRESHOLD,
    DEFAULT_TEMPORAL_ZOOM_MODES,
    DEFAULT_TEMPORAL_ZOOM_TRIGGER_TYPE,
    DEFAULT_TEMPORAL_ZOOM_VISIBILITY,
} from "../../shared/defaults.js";

const unique = values => Array.from(new Set(values));

/**
 * Resolve temporal zoom-in configuration without depending on a widget or UI
 * framework. View renderers can use the returned contract to decide which
 * dimension tools to render.
 */
const normalizeThreshold = (value, fallback) => {
    const threshold = Number(value ?? fallback);
    return Number.isFinite(threshold) && threshold > 0
        ? Math.max(1, Math.floor(threshold))
        : fallback;
};

export const resolveTemporalZoomIn = scalability => {
    const temporalView = scalability?.temporal_view;
    const strategy = temporalView?.strategy ?? DEFAULT_TEMPORAL_STRATEGY;
    const options = temporalView?.zoom_in_options ?? {};
    const configuredModes = Array.isArray(options.modes)
        ? unique(options.modes)
        : DEFAULT_TEMPORAL_ZOOM_MODES;
    const modes = configuredModes.filter(value =>
        DEFAULT_TEMPORAL_ZOOM_MODES.includes(value)
    );
    const visibility = ["all-active", "after-trigger", "off"].includes(
        options.visibility
    )
        ? options.visibility
        : DEFAULT_TEMPORAL_ZOOM_VISIBILITY;
    const triggerType = options.trigger?.type === "time"
        ? "time"
        : DEFAULT_TEMPORAL_ZOOM_TRIGGER_TYPE;
    const defaultThreshold = triggerType === "time"
        ? DEFAULT_TEMPORAL_TIME_THRESHOLD
        : DEFAULT_TEMPORAL_INTERACTION_THRESHOLD;

    return {
        enabled: strategy === "zoom_in",
        modes: modes.length > 0 ? modes : DEFAULT_TEMPORAL_ZOOM_MODES,
        visibility,
        trigger: {
            type: triggerType,
            threshold: normalizeThreshold(
                options.trigger?.threshold,
                defaultThreshold
            ),
            auto_zoom: options.trigger?.auto_zoom === true,
        },
    };
};
