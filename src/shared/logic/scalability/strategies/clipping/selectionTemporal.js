import { SelectionProvenance } from "@provenance-widgets/core";
import { resolveClippingConfig } from "./config.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

/** Pure display projection. Never mutate the controller, source records, or source strategy. */
function resolveClippedView(records, provenance, config, mode) {
    const period = resolveClippingPeriod({ records, config, mode });
    const { boundary, cutoff, startTime } = period;
    if (!boundary) return { ...period, provenance };
    const remaining = records.slice(cutoff + 1).filter(record => record.kind === "interaction");
    const display = new SelectionProvenance();

    // Remember the selected set only to count later selection/deselection deltas.
    // Seed temporal intervals at the window edge; do not count the seed as a new aggregate interaction.
    {
        const baseline = records.slice(0, cutoff + 1).findLast(record => record.kind !== "sample");
        if (baseline) {
            display.insert(baseline.value, { time: new Date(startTime), kind: "baseline" });
            if (config.view === "aggregate_view") {
                display.aggregateData.clear();
                for (const key of ["index", "selections", "interactions", "selectionIndex", "interactionIndex"]) {
                    display.domain.set(key, [0, 0]);
                }
            }
        }
    }
    for (const record of remaining) {
        const options = {
            time: new Date(record.timestamp), caller: record.caller,
            kind: record.kind, source: record.source,
        };
        display.insert(record.value, options);
    }
    return { ...period, provenance: display };
}

/** One configuration/trigger contract for all four categorical selection widgets. */
export function resolveSelectionTemporalView({
    scalability, provenance, records = [], mode = "interaction", width = 0,
}) {
    const resolveView = view => resolveClippedView(
        records, provenance, resolveClippingConfig(scalability, { view, width }), mode
    );
    const temporal = resolveView("temporal_view");
    const aggregate = resolveView("aggregate_view");
    const { start, end, latest } = temporal;
    const clipped = temporal.boundary > 0;
    return {
        temporalProvenance: temporal.provenance,
        aggregateProvenance: aggregate.provenance,
        timeDomain: clipped
            ? [temporal.startTime, Math.max(temporal.startTime + 1, latest)]
            : null,
        // Clipping replaces the display period; its brush cannot recover older periods.
        clippingEnabled: clipped,
        showTemporalAxis: temporal.config.strategy === "zoom_in",
        axis: temporal.config.enabled
            ? { active: false, domain: [start, end], unit: mode === "time" ? "seconds" : "interactions" }
            : null,
        startLabel: temporal.startLabel,
        nowLabel: temporal.nowLabel,
        resetKey: temporal.resetKey,
    };
}
