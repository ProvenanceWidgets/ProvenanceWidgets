import { resolveSmoothingConfig } from "./config.js";
import { hasSmoothingTriggered } from "./trigger.js";
import {
    buildSliderTemporalSmoothingSeries,
    getSliderTemporalSmoothingTriggerRecords,
    smoothSliderTemporalSeries,
} from "./adapters/sliderTemporalSmoothing.js";
import { smoothSavgol } from "./savgol.js";
import { smoothGaussian } from "./gaussian.js";
import { smoothBspline } from "./bspline.js";

const temporalSmoothingMethods = {
    savgol: smoothSavgol,
    gaussian: smoothGaussian,
    bspline: smoothBspline,
};

/**
 * Resolve Slider temporal smoothing independently from aggregate smoothing.
 * The returned samples are display-only and never replace provenance records.
 */
export function resolveSliderTemporalSmoothing({
    scalability,
    entries = [],
    mode = "interaction",
    range = false,
    min,
    max,
}) {
    const config = resolveSmoothingConfig(scalability, "temporal_view");
    const inactive = { active: false, method: config.method.type, samples: [] };
    if (!config.enabled) return inactive;

    const triggerRecords = getSliderTemporalSmoothingTriggerRecords(entries);
    if (!hasSmoothingTriggered(triggerRecords, config.trigger)) return inactive;

    const series = buildSliderTemporalSmoothingSeries({ entries, mode, range });
    const smooth = temporalSmoothingMethods[config.method.type];
    if (!smooth) return inactive;
    const samples = smoothSliderTemporalSeries({
        series,
        method: config.method.options,
        smooth,
        min,
        max,
        range,
    });
    return {
        active: samples.length >= 2,
        method: config.method.type,
        samples,
    };
}
