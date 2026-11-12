import { useLayoutEffect, useState } from "react";
import { normalizeSelectionBrushRange } from "../logic/selectionTimeline.js";
import { shouldCommitSliderChange } from "../logic/sliderInteraction.js";
import { resolveSelectionTemporalView } from "../logic/scalability/index.js";

/** Shared display-only clipping and brush state for categorical selection widgets. */
export default function useSelectionTemporalScalability({
    id, widget, mode, provenance, scalability, records = [], elementRef,
}) {
    const [width, setWidth] = useState(0);
    const [selection, setSelection] = useState(null);
    useLayoutEffect(() => {
        const element = elementRef?.current;
        if (!element) return undefined;
        const measure = () => setWidth(element.getBoundingClientRect().width);
        measure();
        if (typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [elementRef]);

    const view = resolveSelectionTemporalView({ scalability, mode, provenance, records, width });
    const brushKey = `${id}:${view.resetKey}`;
    const brushRange = selection?.key === brushKey ? selection.value : [0, 100];
    const commit = value => {
        setSelection({ key: brushKey, value });
        window.dispatchEvent(new CustomEvent("provenance-widgets", {
            detail: { id, widget, mode, interaction: "brush-end", data: { selection: value } },
        }));
    };
    const onChange = event => {
        const range = normalizeSelectionBrushRange(event.value);
        setSelection({ key: brushKey, value: range });
        if (shouldCommitSliderChange(event)) commit(range);
    };

    return {
        width,
        enabled: view.clippingEnabled,
        showTemporalAxis: view.showTemporalAxis,
        brushRange,
        temporalProvenance: view.temporalProvenance,
        aggregateProvenance: view.aggregateProvenance,
        timeDomain: view.timeDomain,
        sliderProps: {
            startLabel: view.startLabel,
            nowLabel: view.nowLabel,
            axis: view.axis,
            ticks: [],
            step: null,
            value: brushRange,
            onChange,
            onSlideEnd: event => commit(normalizeSelectionBrushRange(event.value ?? brushRange)),
        },
    };
}
