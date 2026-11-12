import { getTemporalAutoZoomRange } from "./autoZoom.js";
import { resolveTemporalZoomIn } from "./config.js";
import { isTemporalZoomToolVisible } from "./visibility.js";

const getEntryRecord = entry => entry?.[1]?.[0];

const getEntryTime = entry => {
    const value = getEntryRecord(entry)?.time;
    const timestamp = value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const isInteractionEntry = entry => {
    const record = getEntryRecord(entry);
    if (record?.kind !== undefined) {
        return record.kind === "interaction";
    }

    // Legacy text histories do not include record kinds. Their first entry is
    // the baseline and buildInputTextTemporalEntries assigns it sequence 0.
    return Number(record?.sequenceIndex) > 0;
};

/** Records used by InputText's trigger policy (distinct from displayed rows). */
export const getInputTextZoomTriggerEntries = (
    entries = [],
    triggerType = "interaction"
) => triggerType === "time"
    ? entries
    : entries.filter(isInteractionEntry);

/**
 * Resolve the interaction-only zoom contract supported by InputText.
 *
 * Text has no numeric value dimension, so value-only and two-dimensional
 * modes do not activate a brush. Trigger visibility counts committed searches
 * rather than the baseline or time-sampling records.
 */
export const resolveInputTextTemporalZoom = ({
    entries = [],
    scalability,
    config,
    temporalBrush = true,
} = {}) => {
    const resolvedConfig = config ?? resolveTemporalZoomIn(scalability);
    const triggerEntries = getInputTextZoomTriggerEntries(
        entries,
        resolvedConfig.trigger.type
    );
    const enabled = resolvedConfig.enabled &&
        resolvedConfig.modes.includes("interactions") &&
        temporalBrush === true;
    const visible = enabled && entries.length > 1 &&
        isTemporalZoomToolVisible({
            entries: triggerEntries,
            visibility: resolvedConfig.visibility,
            trigger: resolvedConfig.trigger,
        });

    return {
        config: resolvedConfig,
        enabled,
        visible,
        triggerEntries,
    };
};

/** Map the shared trigger window back onto InputText's complete row list. */
export const getInputTextAutoZoomRange = (
    entries = [],
    trigger = {}
) => {
    const triggerEntries = getInputTextZoomTriggerEntries(
        entries,
        trigger.type
    );
    const triggerRange = getTemporalAutoZoomRange(triggerEntries, trigger);
    if (!triggerRange) return null;

    const firstEntry = triggerEntries[triggerRange[0]];
    const lastEntry = triggerEntries[triggerRange[1]];
    const start = entries.indexOf(firstEntry);
    const triggerEnd = entries.indexOf(lastEntry);
    if (start < 0 || triggerEnd < 0) return null;

    // Include later sampling rows so an interaction-triggered selection stays
    // anchored at the current end of a time-mode history.
    return [start, Math.max(triggerEnd, entries.length - 1)];
};

/** Domain displayed by the blue axis opposite InputText's full-history axis. */
export const getInputTextZoomDomain = (
    entries = [],
    range,
    mode = "interaction"
) => {
    if (
        !Array.isArray(entries) ||
        entries.length === 0 ||
        !Array.isArray(range) ||
        range.length !== 2
    ) {
        return null;
    }

    const startIndex = Math.max(0, Math.min(
        entries.length - 1,
        Math.floor(Number(range[0]))
    ));
    const endIndex = Math.max(startIndex, Math.min(
        entries.length - 1,
        Math.floor(Number(range[1]))
    ));
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) {
        return null;
    }

    if (mode === "time") {
        const origin = entries.map(getEntryTime).find(value => value !== null);
        const start = getEntryTime(entries[startIndex]);
        const end = getEntryTime(entries[endIndex]);
        if (origin === undefined || start === null || end === null) return null;
        return [(start - origin) / 1000, (end - origin) / 1000];
    }

    const getSequence = (index) => {
        const sequence = Number(getEntryRecord(entries[index])?.sequenceIndex);
        return Number.isFinite(sequence) ? sequence : index;
    };
    return [getSequence(startIndex), getSequence(endIndex)];
};
