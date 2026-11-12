import { buildAdaptiveSliderTicks } from "../logic/sliderTicks.js";
import { ZOOM_BRUSH_ACCENT } from "./brushAppearance.js";

const HORIZONTAL_INSET = 6;
const VERTICAL_INSET = 8;
const AXIS_WIDTH = 24;
const AXIS_HEIGHT = 24;
export const ZOOM_AXIS_TOP_SPACE = 28;
export const ZOOM_AXIS_RIGHT_SPACE = 28;

const isValidDomain = (domain) => (
    Array.isArray(domain) &&
    domain.length === 2 &&
    Number.isFinite(Number(domain[0])) &&
    Number.isFinite(Number(domain[1])) &&
    Number(domain[1]) >= Number(domain[0])
);

const axisColors = theme => theme === "light"
    ? {
        background: "rgba(255, 255, 255, 0.94)",
        line: ZOOM_BRUSH_ACCENT,
        text: ZOOM_BRUSH_ACCENT,
    }
    : {
        background: "rgba(51, 51, 51, 0.94)",
        line: ZOOM_BRUSH_ACCENT,
        text: ZOOM_BRUSH_ACCENT,
    };

/** Render a non-layout-affecting axis for the currently selected domain. */
const ZoomedRangeAxis = ({
    domain,
    orientation = "horizontal",
    pixelLength,
    step = 1,
    minimumStep,
    ticksArray,
    theme = "dark",
    label,
    topInset = ZOOM_AXIS_TOP_SPACE,
    rightInset = ZOOM_AXIS_RIGHT_SPACE,
    horizontalInset = HORIZONTAL_INSET,
    axisKind,
    integerTicks = false,
    positionedTicks,
    guideHeight = 0,
    minTickSpacing = 48,
    formatTick = value => value,
}) => {
    if (!isValidDomain(domain)) return null;

    const min = Number(domain[0]);
    const max = Number(domain[1]);
    const colors = axisColors(theme);
    const horizontal = orientation === "horizontal";
    const length = Math.max(1, Number(pixelLength) || 1);
    // Keep the selected domain for positioning, but place interaction ticks
    // only at actual integer counts within that domain.
    const ticks = integerTicks ? buildAdaptiveSliderTicks({
        min: Math.ceil(min),
        max: Math.floor(max),
        step: 1,
        pixelLength: length,
        minTickSpacing,
    }) : buildAdaptiveSliderTicks({
        min,
        max,
        step,
        minimumStep,
        ticksArray,
        pixelLength: length,
        minTickSpacing,
    });
    const span = max - min;
    const getRatio = value => span > 0
        ? (Number(value) - min) / span
        : 0.5;

    if (horizontal) {
        const trackLength = Math.max(1, length - (horizontalInset * 2));
        return (
            <div
                data-provenance-zoom-axis={axisKind ?? "values"}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: `${rightInset}px`,
                    height: `${AXIS_HEIGHT}px`,
                    background: colors.background,
                    pointerEvents: "none",
                    zIndex: 8,
                }}
            >
                <svg
                    width="100%"
                    height={AXIS_HEIGHT}
                    style={{ display: "block", overflow: "visible" }}
                >
                    <line
                        x1={horizontalInset}
                        x2={length - horizontalInset}
                        y1="8"
                        y2="8"
                        stroke={colors.line}
                    />
                    {ticks.map(tick => {
                        const x = horizontalInset + (
                            getRatio(tick) * trackLength
                        );
                        return (
                            <g key={`zoom-values-tick-${tick}`}>
                                {guideHeight > 0 && (
                                    <line
                                        data-provenance-zoom-guide={tick}
                                        x1={x} x2={x} y1={-guideHeight} y2="8"
                                        stroke={colors.line} strokeOpacity="0.25"
                                        strokeDasharray="2 3"
                                    />
                                )}
                                <line
                                    x1={x}
                                    x2={x}
                                    y1="8"
                                    y2="14"
                                    stroke={colors.line}
                                />
                                <text
                                    x={x}
                                    y="28"
                                    fill={colors.text}
                                    fontSize="10"
                                    textAnchor="middle"
                                >
                                    {formatTick(tick)}
                                </text>
                            </g>
                        );
                    })}
                    {label && (
                        <title>{label}</title>
                    )}
                </svg>
            </div>
        );
    }

    const trackLength = Math.max(1, length - (VERTICAL_INSET * 2));
    // History rows may be evenly spaced even when their sequence numbers
    // repeat or skip. Use their rendered centers instead of interpolating.
    const verticalTicks = positionedTicks ?? ticks.map(value => ({
        value,
        position: VERTICAL_INSET + getRatio(value) * trackLength,
    }));
    let lastLabelPosition = -Infinity;
    return (
        <div
            data-provenance-zoom-axis="interactions"
            aria-hidden="true"
            style={{
                position: "absolute",
                top: `${topInset}px`,
                right: 0,
                width: `${AXIS_WIDTH}px`,
                height: `${length}px`,
                background: colors.background,
                pointerEvents: "none",
                zIndex: 8,
            }}
        >
            <svg
                width={AXIS_WIDTH}
                height={length}
                style={{ display: "block", overflow: "visible" }}
            >
                <line
                    x1="8"
                    x2="8"
                    y1={VERTICAL_INSET}
                    y2={length - VERTICAL_INSET}
                    stroke={colors.line}
                />
                {verticalTicks.map(({ value: tick, position: y }, index) => {
                    const showLabel = y - lastLabelPosition >= 14;
                    if (showLabel) lastLabelPosition = y;
                    return (
                        <g key={`zoom-interactions-tick-${index}`}>
                            <line
                                x1="8"
                                x2="14"
                                y1={y}
                                y2={y}
                                stroke={colors.line}
                            />
                            {showLabel && <text
                                x="18"
                                y={y}
                                dy="0.32em"
                                fill={colors.text}
                                fontSize="10"
                                textAnchor="start"
                            >
                                {formatTick(tick)}
                            </text>}
                        </g>
                    );
                })}
                {label && (
                    <title>{label}</title>
                )}
            </svg>
        </div>
    );
};

export default ZoomedRangeAxis;
