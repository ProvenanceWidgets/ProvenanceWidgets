import {
    DEFAULT_TEMPORAL_INTERACTION_THRESHOLD,
    DEFAULT_TEMPORAL_TIME_THRESHOLD,
} from "../../shared/defaults.js";

const positive = (value, fallback) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? value : fallback;

/** Smoothing is opt-in per view. Unsupported methods never fall back to Savgol. */
export function resolveSmoothingConfig(scalability, view = "aggregate_view") {
    const config = scalability?.[view];
    const options = config?.smoothing_options ?? {};
    const method = options.method ?? { type: "savgol", options: {} };
    const methodOptions = method.options ?? {};
    const type = options.trigger?.type === "time" ? "time" : "interaction";
    const threshold = positive(options.trigger?.threshold, type === "time"
        ? DEFAULT_TEMPORAL_TIME_THRESHOLD : DEFAULT_TEMPORAL_INTERACTION_THRESHOLD);
    const normalizedMethod = method.type === "gaussian" ? {
        type: "gaussian",
        options: {
            sigma: positive(methodOptions.sigma, 2),
            truncate: positive(methodOptions.truncate, 3),
        },
    } : method.type === "bspline" ? {
        type: "bspline",
        options: {
            degree: Number.isInteger(methodOptions.degree) && methodOptions.degree >= 1 &&
                methodOptions.degree <= 5 ? methodOptions.degree : 3,
            smoothing_factor: typeof methodOptions.smoothing_factor === "number" &&
                Number.isFinite(methodOptions.smoothing_factor) &&
                methodOptions.smoothing_factor >= 0 && methodOptions.smoothing_factor <= 1
                ? methodOptions.smoothing_factor : 0.5,
            knot_spacing: positive(methodOptions.knot_spacing, 10),
        },
    } : {
        type: method.type,
        options: {
            window_size: Number.isInteger(methodOptions.window_size) &&
                methodOptions.window_size >= 3 && methodOptions.window_size % 2 === 1
                ? methodOptions.window_size : 5,
            degree: Number.isInteger(methodOptions.degree) && methodOptions.degree >= 1
                ? methodOptions.degree : 3,
        },
    };
    return {
        enabled: config?.strategy === "smoothing" && ["savgol", "gaussian", "bspline"].includes(method.type),
        method: normalizedMethod,
        trigger: { type, threshold: Math.max(1, Math.floor(threshold)) },
    };
}
