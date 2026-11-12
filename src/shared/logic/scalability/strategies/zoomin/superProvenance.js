import { resolveTemporalZoomIn } from "./config.js";
import { isTemporalZoomToolVisible } from "./visibility.js";
import { getTemporalAutoZoomRange } from "./autoZoom.js";
import { normalizeSelectionBrushRange } from "../../../selectionTimeline.js";

export const resolveSuperTemporalZoom = ({
    interactions = [], scalability, temporalBrush = true,
} = {}) => {
    const config = resolveTemporalZoomIn(scalability);
    const entries = interactions.map((interaction, index) => [index, [interaction]]);
    const enabled = config.enabled && config.modes.includes("interactions") && temporalBrush;
    return {
        config,
        entries,
        enabled,
        visible: enabled && entries.length > 1 && isTemporalZoomToolVisible({
            entries, visibility: config.visibility, trigger: config.trigger,
        }),
    };
};

export const getSuperTemporalAutoZoomRange = (entries = [], trigger = {}) => {
    const range = getTemporalAutoZoomRange(entries, trigger);
    return range
        ? [range[0] / entries.length * 100, (range[1] + 1) / entries.length * 100]
        : [0, 100];
};

export const buildSuperTemporalBars = (interactions = [], range = [0, 100]) => {
    const [low, high] = normalizeSelectionBrushRange(range);
    const [start, end] = high > low ? [low, high] : [0, 100];
    const span = end - start;
    const cellWidth = 100 / interactions.length;
    return interactions.flatMap((interaction, sequenceIndex) => {
        const left = Math.max(start, sequenceIndex * cellWidth);
        const right = Math.min(end, (sequenceIndex + 1) * cellWidth);
        if (right - left <= Number.EPSILON * 100) return [];
        return [{
            interaction,
            sequenceIndex,
            left: (left - start) / span * 100,
            width: (right - left) / span * 100,
        }];
    });
};
