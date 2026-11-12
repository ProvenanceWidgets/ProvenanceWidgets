import { resolveSmoothingConfig } from "./config.js";
import { hasSmoothingTriggered } from "./trigger.js";
import { buildSliderAggregateSamples } from "./adapters/sliderAggregate.js";
import { smoothSavgol } from "./savgol.js";
import { smoothGaussian } from "./gaussian.js";
import { smoothBspline } from "./bspline.js";

const methods = { savgol: smoothSavgol, gaussian: smoothGaussian, bspline: smoothBspline };

export function resolveSliderAggregateSmoothing({ scalability, records = [], ...domain }) {
    const config = resolveSmoothingConfig(scalability);
    if (!config.enabled || !hasSmoothingTriggered(records, config.trigger)) return [];
    const samples = buildSliderAggregateSamples(domain);
    return methods[config.method.type](samples, config.method.options).map(sample => ({
        ...sample, count: Math.max(0, sample.count),
    }));
}
