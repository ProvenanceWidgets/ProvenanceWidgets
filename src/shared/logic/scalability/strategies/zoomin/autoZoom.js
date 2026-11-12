const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

export const temporalTriggerMetric = (entries, triggerType) => {
    if (!Array.isArray(entries)) return 0;
    if (triggerType !== "time") return entries.length;

    const timestamps = entries
        .map(([, records]) => getRecordTime(records?.[0]))
        .filter(value => value !== null);
    if (timestamps.length < 2) return 0;

    return (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;
};

const getEntryTimestamp = entry => getRecordTime(entry?.[1]?.[0]);

/** Shared checkbox/slider policy; renderers retain their own range algorithms. */
export const resolveTemporalZoomActions = ({
    entries = [], trigger = {}, previousMetric = 0, enabled = true,
    alreadyAutoZoomed = false,
} = {}) => {
    const crossed = enabled && hasTemporalZoomTriggerCrossed({ entries, trigger, previousMetric });
    const shouldAutoZoom = crossed && entries.length > 1 && !alreadyAutoZoomed &&
        trigger.auto_zoom === true;
    return { crossed, shouldAutoZoom };
};

/** Return the trailing interaction range covered by an auto-zoom trigger. */
export const getTemporalAutoZoomRange = (entries = [], trigger = {}) => {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const threshold = Number(trigger.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
        return [0, entries.length - 1];
    }

    if (trigger.type !== "time") {
        const count = Math.max(1, Math.floor(threshold));
        return [Math.max(0, entries.length - count), entries.length - 1];
    }

    const timestamps = entries.map(getEntryTimestamp);
    const validTimestamps = timestamps.filter(value => value !== null);
    if (validTimestamps.length === 0) return [0, entries.length - 1];

    const latest = Math.max(...validTimestamps);
    const earliest = latest - (threshold * 1000);
    let start = timestamps.findIndex(value => value !== null && value >= earliest);
    if (start < 0) start = entries.length - 1;
    return [start, entries.length - 1];
};

/** Whether a temporal auto-zoom trigger was crossed by the latest entries. */
export const hasTemporalZoomTriggerCrossed = ({
    previousEntries = [],
    previousMetric,
    entries = [],
    trigger = {},
} = {}) => {
    const threshold = Number(trigger.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return false;

    const priorMetric = Number.isFinite(Number(previousMetric))
        ? Number(previousMetric)
        : temporalTriggerMetric(previousEntries, trigger.type);
    const currentMetric = temporalTriggerMetric(entries, trigger.type);
    return priorMetric < threshold && currentMetric >= threshold;
};
