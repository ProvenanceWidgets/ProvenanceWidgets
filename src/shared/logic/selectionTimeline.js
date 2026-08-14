const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

const toTimestamp = value => {
    const date = value instanceof Date ? value : new Date(value);
    const timestamp = date.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
};

export const normalizeSelectionBrushRange = value => {
    if (!Array.isArray(value) || value.length !== 2) {
        return [0, 100];
    }
    const low = clamp(Number(value[0]) || 0, 0, 100);
    const high = clamp(Number(value[1]) || 0, 0, 100);
    return low <= high ? [low, high] : [high, low];
};

export const getSelectionTimeDomain = records => {
    const timestamps = (records ?? [])
        .map(record => toTimestamp(record.timestamp))
        .filter(value => value !== null);
    if (timestamps.length === 0) return [0, 1];
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return [min, max > min ? max : min + 1];
};

export const buildSelectionTimelineBars = ({
    records,
    maxIndex,
    mode = "interaction",
    timeDomain,
    brushRange = [0, 100],
}) => {
    if (!Array.isArray(records)) return [];

    const normalizedBrush = normalizeSelectionBrushRange(brushRange);
    const usesTime = mode === "time";
    const indexOffset = 1;
    const baseMin = usesTime
        ? timeDomain?.[0] ?? 0
        : 0;
    const baseMax = usesTime
        ? Math.max(timeDomain?.[1] ?? 1, baseMin + 1)
        : Math.max((maxIndex ?? 0) - indexOffset, 1);
    const baseSpan = baseMax - baseMin || 1;
    const visibleMin =
        baseMin + (baseSpan * normalizedBrush[0] / 100);
    const visibleMax =
        baseMin + (baseSpan * normalizedBrush[1] / 100);
    const visibleSpan = visibleMax - visibleMin || 1;

    return records.map((record, index) => {
        if (!record?.select) return null;
        const startRaw = usesTime
            ? toTimestamp(record.select.time)
            : (record.select.index ?? 0) - indexOffset;
        const endRaw = usesTime
            ? (
                toTimestamp(record.unselect?.time) ??
                baseMax
            )
            : (
                record.unselect?.index ??
                maxIndex ??
                indexOffset
            ) - indexOffset;
        if (startRaw === null || endRaw === null) return null;
        if (endRaw < visibleMin || startRaw > visibleMax) {
            return null;
        }

        const start = clamp(startRaw, visibleMin, visibleMax);
        const end = clamp(
            Math.max(startRaw, endRaw),
            visibleMin,
            visibleMax
        );
        const left = ((start - visibleMin) / visibleSpan) * 100;
        const width = Math.max(
            0,
            ((end - start) / visibleSpan) * 100
        );
        const relativeTime =
            (startRaw - baseMin) / baseSpan;

        return {
            key: index,
            left,
            width,
            relativeTime: clamp(relativeTime, 0, 1),
            startValue: startRaw,
            endValue: endRaw,
            visibleMin,
            visibleMax,
            isLatest: index === records.length - 1,
            record,
        };
    }).filter(Boolean);
};
