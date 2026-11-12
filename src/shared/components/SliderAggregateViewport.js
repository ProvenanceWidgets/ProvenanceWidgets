import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    resolveSliderAggregateWindowConfig,
    getSliderAggregateWindowLayout,
    sliderWindowStartToScrollLeft,
    sliderWindowScrollLeftToStart,
} from "../logic/scalability/index.js";

// Leave room for endpoint handles, focus rings, and short value labels.
const ENDPOINT_PADDING = 24;
const SCROLLBAR_STYLES = `
    [data-provenance-slider-viewport="windowed"]::-webkit-scrollbar {
        height: 12px;
    }
    [data-provenance-slider-viewport="windowed"]::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 6px;
    }
    [data-provenance-slider-viewport="windowed"]::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border: 2px solid #f1f5f9;
        border-radius: 6px;
    }
    [data-provenance-slider-viewport="windowed"]::-webkit-scrollbar-thumb:hover {
        background: #64748b;
    }
`;

export default function SliderAggregateViewport({
    scalability, min, max, width, label, children,
}) {
    const config = resolveSliderAggregateWindowConfig({ scalability, min, max });
    const enabled = config.enabled && width > ENDPOINT_PADDING * 2;
    const padding = enabled ? ENDPOINT_PADDING : 0;
    const layout = getSliderAggregateWindowLayout({
        config: { ...config, enabled }, width: Math.max(0, width - padding * 2),
    });
    const viewportRef = useRef(null);
    const startRef = useRef(config.start);
    const programmaticScrollRef = useRef(null);
    const snapTimerRef = useRef(null);
    const previousRef = useRef(null);
    const [start, setStart] = useState(config.start);

    useLayoutEffect(() => {
        clearTimeout(snapTimerRef.current);
        const viewport = viewportRef.current;
        if (!viewport || width <= 0) return;
        const previous = previousRef.current;
        const requestedChanged = !previous ||
            previous.requestedStart !== config.requestedStart ||
            (enabled && !previous.enabled);
        const nextStart = requestedChanged ? config.start : startRef.current;
        viewport.scrollLeft = enabled
            ? sliderWindowStartToScrollLeft(layout, nextStart)
            : 0;
        programmaticScrollRef.current = viewport.scrollLeft;
        // Reproject the integer value on resize; native pixel rounding must
        // not replace it with a fractional window start.
        startRef.current = enabled
            ? Math.min(config.maxStart, Math.max(config.min, nextStart))
            : config.min;
        setStart(startRef.current);
        previousRef.current = { requestedStart: config.requestedStart, enabled };
    }, [width, config.min, config.max, config.size, config.requestedStart, enabled]);

    useEffect(() => () => clearTimeout(snapTimerRef.current), []);

    const handleScroll = event => {
        if (!enabled || event.target !== viewportRef.current) return;
        const offset = event.currentTarget.scrollLeft;
        if (offset === programmaticScrollRef.current) {
            programmaticScrollRef.current = null;
            return;
        }
        programmaticScrollRef.current = null;
        startRef.current = sliderWindowScrollLeftToStart(layout, offset);
        setStart(startRef.current);
        // Let a wheel gesture or scrollbar drag accumulate movement before
        // snapping. Resetting every pixel event would trap small trackpad steps.
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = setTimeout(() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            viewport.scrollLeft = sliderWindowStartToScrollLeft(layout, startRef.current);
            programmaticScrollRef.current = viewport.scrollLeft;
            snapTimerRef.current = null;
        }, 120);
    };

    const revealFocusedTarget = event => {
        if (!enabled || event.target === viewportRef.current) return;
        const viewport = viewportRef.current;
        const bounds = viewport.getBoundingClientRect();
        const target = event.target.getBoundingClientRect();
        const left = bounds.left + padding;
        const right = bounds.right - padding;
        // Very wide range-bar hitboxes should retain the browser's own focus
        // position; trying to show both ends would jump between them.
        if (target.width > right - left) return;
        if (target.left < left) viewport.scrollLeft += target.left - left;
        else if (target.right > right) viewport.scrollLeft += target.right - right;
    };
    const visibleStart = enabled
        ? Math.min(config.maxStart, Math.max(config.min, start))
        : config.min;

    return (
        <div
            ref={viewportRef}
            data-provenance-slider-viewport={enabled ? "windowed" : "full"}
            data-window-start={start}
            data-window-size={config.size}
            role={enabled ? "region" : undefined}
            aria-label={enabled ? `${label ?? "Slider"} value window` : undefined}
            tabIndex={enabled ? 0 : undefined}
            onScroll={handleScroll}
            onFocusCapture={revealFocusedTarget}
            onKeyUpCapture={revealFocusedTarget}
            onKeyDownCapture={event => {
                const target = event.target;
                if (enabled && target.getAttribute("role") === "slider") {
                    requestAnimationFrame(() => {
                        if (viewportRef.current?.contains(target)) revealFocusedTarget({ target });
                    });
                }
            }}
            style={{
                width: "100%",
                direction: "ltr",
                overflowX: enabled ? "scroll" : "visible",
                overflowY: enabled ? "hidden" : "visible",
                paddingTop: enabled ? 8 : 0,
            }}
        >
            {enabled && <style>{SCROLLBAR_STYLES}</style>}
            <div style={{
                width: width > 0 ? layout.contentWidth + padding * 2 : "100%",
                boxSizing: "border-box",
                padding: enabled ? `0 ${padding}px 8px` : 0,
            }}>
                {children({
                    width: layout.contentWidth,
                    min: visibleStart,
                    max: enabled ? visibleStart + config.size : config.max,
                    labelPrecision: enabled ? 0 : undefined,
                })}
            </div>
        </div>
    );
}
