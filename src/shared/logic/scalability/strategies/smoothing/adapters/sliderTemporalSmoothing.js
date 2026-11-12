const MAX_TEMPORAL_SMOOTHING_SAMPLES = 2049;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getRecord = entry => entry?.[1]?.[0];

const getRecordKind = record => record?.kind ?? (
    record?.sequenceIndex === 0 ? "baseline" : "interaction"
);

const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const getSingleValue = record => Number(
    Array.isArray(record?.value)
        ? record.value[0]
        : record?.value ?? record?.select?.index
);

const getRangeValue = record => {
    const low = Number(Array.isArray(record?.value)
        ? record.value[0]
        : record?.select?.index);
    const high = Number(Array.isArray(record?.value)
        ? record.value[1]
        : record?.unselect?.index);
    return Number.isFinite(low) && Number.isFinite(high)
        ? [Math.min(low, high), Math.max(low, high)]
        : null;
};

export function getSliderTemporalSmoothingTriggerRecords(entries = []) {
    return entries.map(entry => {
        const record = getRecord(entry);
        return {
            kind: getRecordKind(record),
            timestamp: getRecordTime(record),
        };
    });
}

function collapseDuplicatePositions(points) {
    const collapsed = [];
    for (const point of points) {
        const previous = collapsed.at(-1);
        if (previous?.position === point.position) collapsed[collapsed.length - 1] = point;
        else collapsed.push(point);
    }
    return collapsed;
}

/**
 * Adapt Slider history to a numeric temporal series. Interaction mode uses
 * record-order units; time mode uses elapsed seconds and requires valid times.
 */
export function buildSliderTemporalSmoothingSeries({
    entries = [], mode = "interaction", range = false,
}) {
    const records = entries.map(getRecord);
    if (records.some(record => !record)) return [];

    const timestamps = mode === "time" ? records.map(getRecordTime) : [];
    if (mode === "time" && timestamps.some(timestamp => timestamp === null)) return [];
    const origin = mode === "time" ? timestamps[0] : 0;

    const points = records.map((record, index) => {
        const position = mode === "time"
            ? (timestamps[index] - origin) / 1000
            : index;
        if (range) {
            const value = getRangeValue(record);
            if (!value) return null;
            return {
                position,
                center: (value[0] + value[1]) / 2,
                span: value[1] - value[0],
            };
        }
        const value = getSingleValue(record);
        return Number.isFinite(value) ? { position, value } : null;
    });
    if (points.some(point => point === null)) return [];
    if (points.some((point, index) => index > 0 && point.position < points[index - 1].position)) {
        return [];
    }
    return collapseDuplicatePositions(points);
}

function interpolate(points, field, positions) {
    let upper = 0;
    return positions.map(position => {
        while (upper < points.length && points[upper].position < position) upper += 1;
        if (upper === 0) return points[0][field];
        if (upper >= points.length) return points.at(-1)[field];
        if (points[upper].position === position) return points[upper][field];
        const left = points[upper - 1];
        const right = points[upper];
        const ratio = (position - left.position) / (right.position - left.position);
        return left[field] + ((right[field] - left[field]) * ratio);
    });
}

function uniformPositions(points) {
    const count = Math.min(points.length, MAX_TEMPORAL_SMOOTHING_SAMPLES);
    const min = points[0].position;
    const max = points.at(-1).position;
    if (count < 2 || !(max > min)) return [];
    return Array.from({ length: count }, (_, index) =>
        min + ((index / (count - 1)) * (max - min)));
}

function smoothField(points, field, positions, method, smooth) {
    const uniform = uniformPositions(points);
    if (uniform.length < 2) return [];
    const values = interpolate(points, field, uniform);
    const samples = uniform.map((position, index) => ({
        value: position,
        count: values[index],
    }));
    const smoothed = smooth(samples, method);
    return interpolate(
        smoothed.map(sample => ({ position: sample.value, result: sample.count })),
        "result",
        positions
    );
}

function rebuildRange(center, span, min, max) {
    const domainSpan = max - min;
    const safeSpan = clamp(Number.isFinite(span) ? span : 0, 0, domainSpan);
    const safeCenter = clamp(Number.isFinite(center) ? center : min, min, max);
    const low = clamp(safeCenter - (safeSpan / 2), min, max - safeSpan);
    return [low, low + safeSpan];
}

/**
 * Smooth an adapted temporal series and return display samples. Large histories
 * are reduced to a bounded uniform grid; source entries are never mutated.
 */
export function smoothSliderTemporalSeries({
    series, method, smooth, min, max, range = false,
}) {
    if (!Array.isArray(series) || series.length < 2 || !(max > min)) return [];
    const grid = uniformPositions(series);
    if (grid.length < 2) return [];
    const outputPositions = series.length <= MAX_TEMPORAL_SMOOTHING_SAMPLES
        ? series.map(point => point.position)
        : grid;
    const first = series[0].position;
    const last = series.at(-1).position;
    const offset = position => (position - first) / (last - first);

    if (!range) {
        const values = smoothField(series, "value", outputPositions, method, smooth);
        return outputPositions.map((position, index) => ({
            position,
            offset: offset(position),
            value: clamp(values[index], min, max),
        }));
    }

    const centers = smoothField(series, "center", outputPositions, method, smooth);
    const spans = smoothField(series, "span", outputPositions, method, smooth);
    return outputPositions.map((position, index) => {
        const [low, high] = rebuildRange(centers[index], spans[index], min, max);
        return { position, offset: offset(position), low, high };
    });
}

export { MAX_TEMPORAL_SMOOTHING_SAMPLES };
