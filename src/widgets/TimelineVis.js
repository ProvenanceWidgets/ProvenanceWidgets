import { useMemo } from "react";
import * as d3 from "d3";
import SelectionTimelineSmoothing from "../shared/components/SelectionTimelineSmoothing.js";
import {
    formatTemporalTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import {
    buildSelectionTimelineBars,
} from "../shared/logic/selectionTimeline.js";
import {
    buildClippedSelectionBars,
    getClippedSelectionRestorePoint,
} from "../shared/logic/scalability/index.js";

const TimelineVis = ({
    records,
    maxIndex,
    mode = "interaction",
    timeDomain,
    brushRange,
    clipping = false,
    smoothing = false,
    smoothingBoundaryRadius,
    smoothingWholeBar = false,
    smoothingBlurRadius,
    leftInsetPx = 0,
    tooltipId,
    widgetId,
    value,
    kind = "single-selection",
    onRestore,
}) => {
    const bars = useMemo(
        () => (clipping
            ? buildClippedSelectionBars
            : buildSelectionTimelineBars)({
            records,
            maxIndex,
            mode,
            timeDomain,
            brushRange,
        }).map(bar => {
            // Preserve the committed recency rule: only the latest interval is orange.
            // Its relative start index fades as the global interaction domain grows.
            const color = bar.isLatest
                ? d3.interpolateOranges(0.3 + bar.relativeTime * 0.7)
                : "#E5E5E5";
            return {
                ...bar,
                color,
                left: `${bar.left}%`,
                width: `${bar.width}%`,
                background: color,
            };
        }),
        [
            records,
            maxIndex,
            mode,
            timeDomain,
            brushRange,
            clipping,
        ]
    );

    const zoomed = !clipping && Array.isArray(brushRange) &&
        (brushRange[0] > 0 || brushRange[1] < 100);

    const restoreBar = (bar, event) => {
        if (!onRestore) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds =
            event.currentTarget?.parentElement?.getBoundingClientRect?.();
        const clientX = Number(event.clientX);
        const pointerRatio =
            (!clipping || (event.type === "click" && event.detail !== 0)) &&
            bounds &&
            Number.isFinite(clientX) &&
            bounds.width > 0
                ? Math.max(
                    0,
                    Math.min(1, (clientX - bounds.left) / bounds.width)
                )
                : null;
        const point = clipping
            ? getClippedSelectionRestorePoint(bar, pointerRatio)
            : pointerRatio === null
                ? bar.startValue
                : (
                    bar.visibleMin +
                    pointerRatio * (bar.visibleMax - bar.visibleMin)
                );
        onRestore(value, bar.record, event, {
            point,
            mode,
            bar,
        });
    };

    return (
        <div
            style={{
                position: "relative",
                height: "24px",
                background: "#fff",
                width: "100%",
                flex: 1,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${leftInsetPx}px`,
                    right: 0,
                    overflow: "hidden",
                }}
            >
                {smoothing && <SelectionTimelineSmoothing bars={bars} boundaryRadius={smoothingBoundaryRadius} wholeBar={smoothingWholeBar} blurRadius={smoothingBlurRadius} />}
                {bars.map(bar => {
                    const tooltipProps = getTooltipAnchorProps(
                        tooltipId,
                        () => {
                            const content = formatTemporalTooltip({
                                label: widgetId,
                                value,
                                record: bar.record,
                                kind,
                            });
                            return zoomed && mode !== "time"
                                ? `${content}\nInteraction range: ${bar.startValue}–${bar.endValue}${bar.record.unselect ? " (end exclusive)" : " (current)"}`
                                : content;
                        }
                    );

                    return (
                        <div
                            key={bar.key}
                            data-provenance-timeline-bar="true"
                            data-provenance-temporal-value={value}
                            {...tooltipProps}
                            role={onRestore ? "button" : undefined}
                            tabIndex={onRestore ? 0 : undefined}
                            aria-label={
                                onRestore
                                    ? `Restore ${widgetId} to ${value}`
                                    : undefined
                            }
                            onMouseDown={event => {
                                if (!onRestore) return;
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onClick={event => {
                                restoreBar(bar, event);
                            }}
                            onKeyDown={event => {
                                if (
                                    !onRestore ||
                                    (
                                        event.key !== "Enter" &&
                                        event.key !== " "
                                    )
                                ) {
                                    return;
                                }
                                restoreBar(bar, event);
                            }}
                            style={{
                                ...tooltipProps.style,
                                position: "absolute",
                                left: bar.left,
                                width: bar.width,
                                minWidth: bar.width === "0%" ? "1px" : undefined,
                                boxSizing: "border-box",
                                height: "24px",
                                top: 0,
                                background: smoothing ? "transparent" : bar.background,
                                border: !smoothing
                                    ? `1px solid ${d3.color(bar.color).darker().formatHex()}` : undefined,
                                opacity: 1,

                                zIndex: 0,
                                cursor: onRestore
                                    ? "pointer"
                                    : "default",
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineVis;
