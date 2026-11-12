import { useEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import TemporalZoomBrush from "./TemporalZoomBrush.js";
import ZoomedRangeAxis from "./ZoomedRangeAxis.js";
import useElementSize from "../hooks/useElementSize.js";
import { normalizeSelectionBrushRange } from "../logic/selectionTimeline.js";
import {
    buildSuperTemporalBars,
    getSuperTemporalAutoZoomRange,
    resolveSuperTemporalZoom,
} from "../logic/scalability/strategies/zoomin/superProvenance.js";
import { resolveTemporalZoomActions, temporalTriggerMetric } from "../logic/scalability/index.js";

export default function SuperTemporalView({
    id, interactions, widgetIds, onRestore, scalability, temporalBrush = true,
}) {
    const { config, entries, enabled, visible } = resolveSuperTemporalZoom({
        interactions, scalability, temporalBrush,
    });
    const [measure, { width }] = useElementSize();
    const [selection, setSelection] = useState(null);
    const previous = useRef(null);
    const key = JSON.stringify([id, temporalBrush, config]);
    const metric = temporalTriggerMetric(entries, config.trigger.type);
    const reset = !previous.current || previous.current.key !== key ||
        entries.length < previous.current.count || metric < previous.current.metric;
    const range = visible && !reset && selection?.key === key ? selection.value : [0, 100];
    const zoomed = range[0] > 0 || range[1] < 100;
    const bars = buildSuperTemporalBars(interactions, range);

    useEffect(() => {
        const prior = previous.current;
        const actions = resolveTemporalZoomActions({
            entries,
            trigger: config.trigger,
            enabled: enabled && config.visibility !== "off",
            previousMetric: reset ? 0 : prior.metric,
            alreadyAutoZoomed: !reset && prior.autoZoomed,
        });
        if (reset) setSelection(null);
        if (actions.shouldAutoZoom) {
            setSelection({ key, value: getSuperTemporalAutoZoomRange(entries, config.trigger) });
        }
        previous.current = {
            key, metric, count: entries.length,
            autoZoomed: actions.shouldAutoZoom || (!reset && prior.autoZoomed),
        };
    }, [key, metric, entries.length]);

    const changeRange = value => {
        const normalized = normalizeSelectionBrushRange(value);
        setSelection({ key, value: normalized[1] > normalized[0] ? normalized : [0, 100] });
    };

    return (
        <div ref={measure} data-provenance-super-temporal={id}>
            {interactions.length > 0 && (
                <div style={{ position: "relative", width: "100%", height: 40, marginBottom: 8 }}>
                    {bars.map(({ interaction, sequenceIndex, left, width }) => (
                        <div key={sequenceIndex}
                            data-provenance-super-interaction={sequenceIndex}
                            data-tooltip-id={id + "-interaction-tooltip-" + sequenceIndex}
                            data-tooltip-content={`Widget: ${interaction.widgetId} | Time: ${interaction.time ? interaction.time.toLocaleString() : "N/A"} | Index: ${interaction.index ?? "N/A"}`}
                            style={{
                                position: "absolute", left: left + "%", width: width + "%",
                                height: "100%", boxSizing: "border-box",
                                backgroundColor: interaction.color, opacity: 0.6,
                                border: "1px solid rgba(0, 0, 0, 0.3)", cursor: "pointer",
                            }}
                            onClick={() => onRestore(interaction)}
                            onMouseEnter={event => event.currentTarget.style.opacity = 1}
                            onMouseLeave={event => event.currentTarget.style.opacity = 0.6}
                        >
                            <Tooltip id={id + "-interaction-tooltip-" + sequenceIndex} opacity={1} />
                        </div>
                    ))}
                </div>
            )}
            {widgetIds.map((target, index) => (
                <div key={target} data-provenance-super-track={target} style={{
                    position: "relative", minHeight: 32,
                    borderBottom: index < widgetIds.length - 1 ? "1px solid #eee" : "none",
                }}>
                    <div style={{ padding: "0.5rem", position: "relative", zIndex: 1 }}>
                        <label style={{ fontSize: 14, fontWeight: 500, color: "#999" }}>{target}</label>
                    </div>
                    <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
                        {bars.filter(({ interaction }) => interaction.widgetId === target)
                            .map(({ interaction, sequenceIndex, left, width }) => (
                                <div key={sequenceIndex} style={{
                                    position: "absolute", left: left + "%", width: width + "%",
                                    height: "100%", backgroundColor: interaction.color, opacity: 0.45,
                                }} />
                            ))}
                    </div>
                </div>
            ))}
            {visible && (
                <div data-provenance-zoom-footer={id}
                    style={{ position: "relative", height: 36, marginTop: 6 }}>
                    {zoomed && <ZoomedRangeAxis
                        domain={range.map(percent => interactions.length * percent / 100)}
                        pixelLength={width} integerTicks axisKind="interactions"
                        horizontalInset={0} rightInset={0} theme="light"
                        label="Selected interaction range"
                    />}
                </div>
            )}
            {visible && (
                <TemporalZoomBrush
                    id={id} label="SuperProvenance" mode="interaction"
                    domain={[0, interactions.length]} value={range}
                    onChange={changeRange}
                    onCommit={value => window.dispatchEvent(new CustomEvent("provenance-widgets", {
                        detail: { id, widget: "super-provenance", mode: "interaction",
                            interaction: "brush-end", data: { selection: value } },
                    }))}
                />
            )}
        </div>
    );
}
