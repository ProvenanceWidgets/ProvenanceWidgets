import { getRangeBarSegments } from "../../../../rangeSliderBarData.js";

// Bound numerical work independently of DOM width. Larger domains are averaged
// into data-domain bins; the original provenance and bars are never modified.
export const MAX_SMOOTHING_SAMPLES = 2049;

export function buildSliderAggregateSamples({ provenance, min, max, step = 1, kind = "single" }) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min ||
        !Number.isFinite(step) || step <= 0) return [];
    const requestedIntervals = Math.ceil((max - min) / step);
    const intervals = Math.min(MAX_SMOOTHING_SAMPLES - 1, requestedIntervals);
    const spacing = (max - min) / intervals;
    const samples = Array.from({ length: intervals + 1 }, (_, index) => ({
        value: min + index * spacing,
        count: 0,
    }));

    if (kind === "range") {
        const segments = getRangeBarSegments(provenance, min, max);
        if (requestedIntervals > intervals) {
            for (const sample of samples) {
                const low = Math.max(min, sample.value - spacing / 2);
                const high = Math.min(max, sample.value + spacing / 2);
                const width = high - low;
                if (!(width > 0)) continue;
                sample.count = segments.reduce((total, segment) => {
                    const overlap = Math.max(
                        0,
                        Math.min(high, segment.high) - Math.max(low, segment.low)
                    );
                    return total + segment.count * overlap / width;
                }, 0);
            }
            return samples;
        }

        let segmentIndex = 0;
        for (const sample of samples) {
            while (segmentIndex < segments.length &&
                (sample.value >= segments[segmentIndex].high && sample.value < max)) {
                segmentIndex += 1;
            }
            const segment = segments[segmentIndex];
            if (segment && sample.value >= segment.low &&
                (sample.value < segment.high || (sample.value === max && segment.high === max))) {
                sample.count = segment.count;
            }
        }
        return samples;
    }

    const binSize = Math.max(1, spacing / step);
    for (const [value, record] of provenance?.aggregateData ?? []) {
        const numeric = Number(value);
        const count = Number(record?.count);
        if (!Number.isFinite(numeric) || numeric < min || numeric > max ||
            !Number.isFinite(count) || count < 0) continue;
        const index = Math.min(intervals, Math.max(0, Math.round((numeric - min) / spacing)));
        samples[index].count += count / binSize;
    }
    return samples;
}
