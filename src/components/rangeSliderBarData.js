const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Convert RangedProvenance's aggregate buckets into non-overlapping drawable
 * segments. Each bucket already represents one disjoint [low, high] interval;
 * drawing detailedData here would layer complete historical selections on top
 * of one another and obscure their aggregate counts.
 */
export function getRangeBarSegments(guidance, min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];

    const aggregateEntries = guidance?.aggregateData instanceof Map
        ? [...guidance.aggregateData.entries()]
        : [];

    const segments = aggregateEntries
        .map(([lowValue, record]) => {
            const low = clamp(Number(lowValue), min, max);
            const high = clamp(Number(record?.highValue), min, max);
            const count = Number(record?.count);
            const index = Number(record?.index);
            const time = record?.time;

            return {
                low,
                high,
                count,
                index,
                ...(time ? { time } : {}),
            };
        })
        .filter(segment => (
            Number.isFinite(segment.low) &&
            Number.isFinite(segment.high) &&
            Number.isFinite(segment.count) &&
            segment.count > 0 &&
            segment.high > segment.low
        ))
        .sort((a, b) => a.low - b.low || a.high - b.high);

    return segments;
}

export function normalizeRangeBarIndex(index, domain) {
    const [domainMin = 0, domainMax = 0] = domain || [];
    if (domainMax <= domainMin) return 1;
    return clamp((index - domainMin) / (domainMax - domainMin), 0, 1);
}
