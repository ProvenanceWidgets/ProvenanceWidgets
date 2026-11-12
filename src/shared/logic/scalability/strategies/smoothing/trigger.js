/** Count commits, not aggregate buckets; time uses recorded history, not wall time. */
export function hasSmoothingTriggered(records = [], trigger = {}) {
    let count = 0;
    let first = Infinity;
    let last = -Infinity;
    for (const record of records) {
        if (record.kind === "interaction") count += 1;
        if (record.timestamp == null) continue;
        const time = new Date(record.timestamp).getTime();
        if (Number.isFinite(time)) {
            first = Math.min(first, time);
            last = Math.max(last, time);
        }
    }
    const metric = trigger.type === "time"
        ? Number.isFinite(first) ? (last - first) / 1000 : 0
        : count;
    return count > 0 && metric >= trigger.threshold;
}
