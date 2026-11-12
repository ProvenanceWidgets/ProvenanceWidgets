import { useEffect, useRef } from "react";
import { brushX, select, ticks } from "d3";
import useElementSize from "../hooks/useElementSize.js";
import { styleZoomBrush } from "./brushAppearance.js";

/** Horizontal counterpart of the sliders' drag-to-zoom interaction brush. */
export default function TemporalZoomBrush({ id, label, mode, domain, value, onChange, onCommit }) {
    const [measure, { width }] = useElementSize();
    const brushRef = useRef(null);
    const live = useRef({ value, onChange, onCommit });
    live.current = { value, onChange, onCommit };
    const instance = useRef(null);
    const [min, max] = domain;
    const tickValues = [...new Set([min, ...ticks(min, max, Math.max(2, Math.floor(width / 55))), max])]
        .filter(value => mode === "time" || Number.isInteger(value));

    useEffect(() => {
        if (!brushRef.current || width <= 0) return undefined;
        const change = event => {
            // Programmatic synchronization must not log an extra user action.
            if (!event.sourceEvent) return;
            const range = event.selection?.map(x => x / width * 100) ?? [0, 100];
            live.current.onChange(range);
            if (event.type === "end") live.current.onCommit(range);
        };
        const brush = brushX().extent([[0, 0], [width, 32]])
            .on("brush end", change);
        instance.current = brush;
        const group = select(brushRef.current).call(brush);
        styleZoomBrush(group, "x");
        const range = live.current.value;
        group.call(brush.move, range[0] === 0 && range[1] === 100
            ? null : range.map(percent => percent / 100 * width));
        return () => {
            group.on(".brush", null);
            instance.current = null;
        };
    }, [width]);

    useEffect(() => {
        if (!instance.current || !brushRef.current) return;
        select(brushRef.current).call(instance.current.move,
            value[0] === 0 && value[1] === 100 ? null : value.map(percent => percent / 100 * width));
    }, [value[0], value[1], width]);

    return (
        <div ref={measure} data-provenance-temporal-brush={id}>
            <svg width="100%" height="68" style={{ display: "block", overflow: "visible" }}
                aria-label={`Drag horizontally to zoom ${label} history`}>
                <title>Drag horizontally to zoom history. Click outside the selection to reset.</title>
                <line x1="0" x2="100%" y1="8" y2="8" stroke="#6c757d" />
                <g ref={brushRef} transform="translate(0,8)" />
                <g pointerEvents="none">
                    {tickValues.map(tick => (
                        <g key={tick} transform={`translate(${max > min ? (tick - min) / (max - min) * width : 0},8)`}>
                            <line y2="8" stroke="#6c757d" />
                            <text y="25" textAnchor="middle" fill="#6c757d" fontSize="10">{mode === "time" ? `${Number(tick.toFixed(2))}s` : tick}</text>
                        </g>
                    ))}
                    <text x="50%" y="62" textAnchor="middle" fill="#6c757d" fontSize="11">
                        {mode === "time" ? "time" : "interaction"} · drag to zoom
                    </text>
                </g>
            </svg>
        </div>
    );
}
