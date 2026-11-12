const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

/** Whether temporal zoom tools are active for the current trigger state. */
export const isTemporalZoomToolVisible = ({
    entries = [],
    visibility = "all-active",
    trigger = {},
}) => {
    if (visibility === "off") return false;
    if (visibility !== "after-trigger") return true;

    const threshold = Number(trigger.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return false;

    if (trigger.type === "time") {
        const timestamps = entries
            .map(([, records]) => getRecordTime(records?.[0]))
            .filter(value => value !== null);
        if (timestamps.length < 2) return false;
        return (
            (Math.max(...timestamps) - Math.min(...timestamps)) / 1000
        ) >= threshold;
    }

    return entries.length >= threshold;
};
