const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

export const TEMPORAL_LINE_COLOR = "#495057";
export const TEMPORAL_LINE_WIDTH = 1;

export const normalizeTemporalBrush = value => value === true;

export const resolveTemporalBrushEnabled = ({
    temporalBrush,
    enableTemporalBrush,
} = {}) => temporalBrush ?? enableTemporalBrush ?? true;

export const brushSelectionToIndexRange = (
    selection,
    height,
    entryCount
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isInteger(entryCount) ||
        entryCount <= 0
    ) {
        return null;
    }

    const top = clamp(Math.min(...selection), 0, height);
    const bottom = clamp(Math.max(...selection), 0, height);
    const start = clamp(
        Math.floor((top / height) * entryCount),
        0,
        entryCount - 1
    );
    const end = clamp(
        Math.max(
            start,
            Math.ceil((bottom / height) * entryCount) - 1
        ),
        0,
        entryCount - 1
    );
    return [start, end];
};

export const filterTemporalEntries = (entries, range) => {
    if (!Array.isArray(entries)) return [];
    if (!range) return entries;
    const [start, end] = range;
    return entries.slice(start, end + 1);
};

export const brushSelectionToPositionRange = (
    selection,
    positions
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Array.isArray(positions) ||
        positions.length === 0
    ) {
        return null;
    }

    const top = Math.min(...selection);
    const bottom = Math.max(...selection);
    let start = positions.findIndex(position => position >= top);
    let end = -1;
    for (let index = positions.length - 1; index >= 0; index -= 1) {
        if (positions[index] <= bottom) {
            end = index;
            break;
        }
    }

    if (start === -1) start = positions.length - 1;
    if (end === -1) end = 0;
    if (start > end) {
        const center = (top + bottom) / 2;
        const nearest = positions.reduce(
            (best, position, index) =>
                Math.abs(position - center) <
                Math.abs(positions[best] - center)
                    ? index
                    : best,
            0
        );
        return [nearest, nearest];
    }
    return [start, end];
};

const getEntryRecord = entry => entry?.[1]?.[0];

export const getTemporalYPositions = (
    entries,
    mode,
    height
) => {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    if (entries.length === 1) return [height / 2];

    const padding = 8;
    const drawableHeight = Math.max(0, height - (padding * 2));
    if (mode !== "time") {
        return entries.map((_, index) =>
            padding + ((index / (entries.length - 1)) * drawableHeight)
        );
    }

    const timestamps = entries.map(entry => {
        const value =
            getEntryRecord(entry)?.time ??
            getEntryRecord(entry)?.select?.time;
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
    });
    const valid = timestamps.filter(value => value !== null);
    if (valid.length !== timestamps.length) {
        return getTemporalYPositions(entries, "interaction", height);
    }

    const minTime = Math.min(...valid);
    const maxTime = Math.max(...valid);
    if (minTime === maxTime) {
        return getTemporalYPositions(entries, "interaction", height);
    }
    return timestamps.map(timestamp =>
        padding + (
            ((timestamp - minTime) / (maxTime - minTime)) *
            drawableHeight
        )
    );
};

const getRangeEndpoint = (record, endpoint, domainMax) => {
    if (!record?.select) return null;
    if (endpoint === "low") return record.select.index;
    return record.unselect?.index ?? domainMax;
};

/**
 * Builds independent low and high trajectories for slider history. A range's
 * endpoints must never be joined to each other or crossed between rows: low
 * connects to the next low, and high connects to the next high.
 */
export const buildTemporalSliderConnections = ({
    entries,
    yPositions,
    domainMin,
    domainMax,
    range = false,
}) => {
    if (
        !Array.isArray(entries) ||
        !Array.isArray(yPositions) ||
        entries.length < 2 ||
        yPositions.length !== entries.length
    ) {
        return [];
    }

    const domainSpan = domainMax - domainMin;
    if (!Number.isFinite(domainSpan) || domainSpan <= 0) return [];

    const endpoints = range ? ["low", "high"] : ["low"];
    const connections = [];
    for (let index = 0; index < entries.length - 1; index += 1) {
        const currentRecord = getEntryRecord(entries[index]);
        const nextRecord = getEntryRecord(entries[index + 1]);

        for (const endpoint of endpoints) {
            const currentValue = getRangeEndpoint(
                currentRecord,
                endpoint,
                domainMax
            );
            const nextValue = getRangeEndpoint(
                nextRecord,
                endpoint,
                domainMax
            );
            if (
                !Number.isFinite(currentValue) ||
                !Number.isFinite(nextValue)
            ) {
                continue;
            }

            connections.push({
                endpoint,
                fromIndex: index,
                toIndex: index + 1,
                x1: ((currentValue - domainMin) / domainSpan) * 100,
                y1: yPositions[index],
                x2: ((nextValue - domainMin) / domainSpan) * 100,
                y2: yPositions[index + 1],
            });
        }
    }
    return connections;
};

export const restoreTemporalPoint = ({
    restoreWidgetValue,
    target,
    record,
    range = false,
}) => {
    if (typeof restoreWidgetValue !== "function" || !record) return false;
    const value = range
        ? record.value
        : (
            Array.isArray(record.value)
                ? record.value[0]
                : record.value ?? record.select?.index
        );
    if (value === undefined) return false;
    return restoreWidgetValue(target, value, "history");
};
