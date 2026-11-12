import { resolveClippingConfig } from "./config.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

/** Adapter for the one-record-per-row histories of text and numeric widgets. */
export function resolveRecordTemporalView({ entries = [], scalability, width = 0, mode = "interaction" }) {
    const config = resolveClippingConfig(scalability, { width });
    const records = entries.map(([, [record]]) => ({
        timestamp: record.time,
        kind: record.kind ?? (record.sequenceIndex === 0 ? "baseline" : "interaction"),
    }));
    const period = resolveClippingPeriod({ records, config, mode });
    let count = 0;
    const positions = records.map(record => {
        if (record.kind === "interaction") count += 1;
        return mode === "time"
            ? (new Date(record.timestamp).getTime() - period.origin) / 1000
            : count;
    });
    const visibleIndexes = entries.map((_, index) => index).filter(index =>
        !period.boundary || (index > period.cutoff && records[index].kind === "interaction")
    );
    return {
        ...period,
        enabled: config.enabled,
        entries: visibleIndexes.map(index => entries[index]),
        positions: visibleIndexes.map(index => positions[index]),
    };
}

export function getClippedTemporalYPositions(view, height) {
    const span = view.end - view.start;
    return view.positions.map(position => span > 0
        ? 8 + Math.max(0, Math.min(1, (position - view.start) / span)) * (height - 16)
        : height / 2);
}
