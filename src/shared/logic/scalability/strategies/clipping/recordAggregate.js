import { cloneProvenanceValue } from "@provenance-widgets/core";
import { resolveClippingConfig } from "./config.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

/** Rebuild only the visible text/numeric frequencies; registered history stays intact. */
export function resolveRecordAggregateView({
    records = [], provenance, strategyFactory, scalability, width = 0, mode = "interaction",
}) {
    const config = resolveClippingConfig(scalability, { view: "aggregate_view", width });
    const period = resolveClippingPeriod({ records, config, mode });
    if (!period.boundary) return { ...period, aggregateProvenance: provenance };

    const display = strategyFactory();
    // This period starts without a baseline. Its first interaction is selection 1.
    display.tooltipIndexOffset = 0;
    const remaining = records.slice(period.cutoff + 1).filter(record => record.kind === "interaction");
    for (const record of remaining) {
        display.insert(cloneProvenanceValue(record.value), {
            time: new Date(record.timestamp), caller: record.caller,
            kind: record.kind, source: record.source,
        });
    }
    display.hasUserInteracted = remaining.length > 0;
    return { ...period, aggregateProvenance: display };
}
