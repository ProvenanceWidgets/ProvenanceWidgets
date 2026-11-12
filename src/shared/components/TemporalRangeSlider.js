import { useEffect, useRef, useState } from "react";
import { Slider } from "primereact/slider/slider.esm.js";
import { axisToInteraction } from "../logic/scalability/index.js";

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

const temporalRangeSliderStyles = `
    .pw-temporal-range-slider {
        box-sizing: border-box;
        width: 100%;
        color: #55637d;
        font-size: 16px;
        font-weight: 700;
        position: relative;
    }

    .pw-temporal-range-slider__labels {
        position: relative;
        line-height: 1;
        height: 16px;
        pointer-events: none;
    }

    .pw-temporal-range-slider--inline
        .pw-temporal-range-slider__labels {
        margin-top: 5px;
    }

    .pw-temporal-range-slider--footer
        .pw-temporal-range-slider__labels {
        margin-bottom: 19px;
    }

    .pw-temporal-range-slider__start-label,
    .pw-temporal-range-slider__end-label {
        position: absolute;
        top: 0;
        white-space: nowrap;
    }

    .pw-temporal-range-slider__start-label { left: 0; }
    .pw-temporal-range-slider__end-label { right: 0; }
    .pw-temporal-range-slider__track { position: relative; }

    .pw-temporal-range-slider__control.p-slider {
        height: 16px !important;
        margin: 0 !important;
        background: rgba(113, 231, 251, 0.06) !important;
        border: 0 !important;
        border-radius: 0 !important;
    }

    .pw-temporal-range-slider__control .p-slider-range {
        background: rgba(113, 231, 251, 0.24) !important;
        box-shadow: inset 0 0 0 1px #17a2b8;
    }

    .pw-temporal-range-slider__control .p-slider-handle {
        top: auto !important;
        bottom: 0 !important;
        width: 8px !important;
        height: 16px !important;
        margin-top: 0 !important;
        margin-left: -4px !important;
        background: #17a2b8 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    .pw-temporal-range-slider__tick {
        position: absolute;
        top: 0;
        width: 1px;
        height: 12px;
        background: #adb5bd;
        pointer-events: none;
    }

    .pw-temporal-range-slider__tick-label {
        position: absolute;
        top: 12px;
        left: 2px;
        font-size: 10px;
        font-weight: 400;
        color: #868e96;
        white-space: nowrap;
        transform: translateX(-50%);
    }

    .pw-temporal-range-slider__tooltip {
        position: absolute;
        bottom: 26px;
        transform: translateX(-50%);
        padding: 3px 8px;
        background: #1f2937;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
    }
`;

const TemporalRangeSlider = ({
    id,
    startLabel,
    clipCount = 0,
    nowLabel = "now",
    label,
    mode,
    axis = null,
    ticks = [],
    step = null,
    onChange,
    onSlideEnd,
    placement = "inline",
    value,
}) => {
    const [tooltip, setTooltip] = useState(null);
    const trackRef = useRef(null);
    const draggingRef = useRef(false);
    const axisRef = useRef(axis);
    axisRef.current = axis;
    const originFontSize = Math.max(
        10,
        16 - Math.max(0, clipCount) * 0.5
    );

    const updateTooltip = clientX => {
        const bounds = trackRef.current?.getBoundingClientRect?.();
        const currentAxis = axisRef.current;
        if (!bounds || bounds.width <= 0 || !currentAxis) return;
        const position = clamp(
            ((clientX - bounds.left) / bounds.width) * 100,
            0,
            100
        );
        const interaction = axisToInteraction(
            position,
            currentAxis
        );
        setTooltip({
            position,
            text: `Now at ${Math.round(interaction)}${currentAxis.unit === "seconds" ? "s" : ""}`,
        });
    };

    useEffect(() => {
        const move = event => {
            if (draggingRef.current) updateTooltip(event.clientX);
        };
        const end = event => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            const bounds = trackRef.current?.getBoundingClientRect?.();
            if (
                bounds &&
                event.clientX >= bounds.left &&
                event.clientX <= bounds.right &&
                event.clientY >= bounds.top &&
                event.clientY <= bounds.bottom
            ) {
                updateTooltip(event.clientX);
            } else {
                setTooltip(null);
            }
        };
        const cancel = () => {
            draggingRef.current = false;
            setTooltip(null);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", cancel);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", cancel);
        };
    }, []);

    useEffect(() => {
        if (!axis) setTooltip(null);
    }, [axis]);

    const labels = (
        <div
            className="pw-temporal-range-slider__labels"
            aria-hidden="true"
        >
            <span
                className="pw-temporal-range-slider__start-label"
                style={{ fontSize: `${originFontSize}px` }}
            >
                {startLabel ?? (mode === "time" ? "t=0" : "n=0")}
            </span>
            <span className="pw-temporal-range-slider__end-label">
                {nowLabel}
            </span>
        </div>
    );

    return (
        <div
            className={
                `pw-temporal-range-slider ` +
                `pw-temporal-range-slider--${placement}`
            }
            data-provenance-temporal-brush={id}
            title={
                axis
                    ? undefined
                    : "Drag both handles to zoom the visible provenance range"
            }
        >
            <style>{temporalRangeSliderStyles}</style>
            {placement === "footer" && labels}
            <div
                ref={trackRef}
                className="pw-temporal-range-slider__track"
                onPointerEnter={event => updateTooltip(event.clientX)}
                onPointerMove={event => updateTooltip(event.clientX)}
                onPointerLeave={() => {
                    if (!draggingRef.current) setTooltip(null);
                }}
                onPointerDownCapture={event => {
                    draggingRef.current = true;
                    updateTooltip(event.clientX);
                }}
            >
                <Slider
                    className="pw-temporal-range-slider__control"
                    range
                    min={0}
                    max={100}
                    step={step}
                    value={value}
                    onChange={onChange}
                    onSlideEnd={onSlideEnd}
                    aria-label={`${label} temporal range`}
                />
                {ticks.filter(tick => tick.position > 0).map((tick, index) => (
                    <span
                        key={`${tick.position}-${index}`}
                        className="pw-temporal-range-slider__tick"
                        style={{ left: `${tick.position}%` }}
                    >
                        {tick.label && (
                            <span className="pw-temporal-range-slider__tick-label">
                                {tick.label}
                            </span>
                        )}
                    </span>
                ))}
                {tooltip && (
                    <div
                        className="pw-temporal-range-slider__tooltip"
                        style={{ left: `${tooltip.position}%` }}
                    >
                        {tooltip.text}
                    </div>
                )}
            </div>
            {placement === "inline" && labels}
        </div>
    );
};

export default TemporalRangeSlider;
