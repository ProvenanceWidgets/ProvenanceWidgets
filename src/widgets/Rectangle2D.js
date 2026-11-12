import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import * as d3 from "d3";
import { rectangleZoomStyle } from "../shared/components/brushAppearance.js";
import {
    formatTemporalTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import {
    getTemporalYPositions,
    TEMPORAL_LINE_COLOR,
    TEMPORAL_LINE_WIDTH,
} from "../shared/logic/sliderTemporal.js";
import {
    normalizeRectangle,
    rectangleContainsPoint,
} from "../shared/logic/scalability/index.js";

const TEMPORAL_AXIS_GUTTER = 64;

/**
 * Owns the rectangle interaction state. The caller supplies a mutable
 * geometry ref so pointer events always use the latest rendered points.
 */
export const useRectangle2D = ({ enabled, geometryRef }) => {
    const [selection, setSelection] = useState(null);
    const [dragMode, setDragMode] = useState(null);
    const [points, setPoints] = useState([]);
    const [valueDomain, setValueDomain] = useState(null);
    const selectionRef = useRef(null);
    const dragRef = useRef(null);

    const clear = useCallback(() => {
        selectionRef.current = null;
        dragRef.current = null;
        setDragMode(null);
        setSelection(null);
        setPoints([]);
        setValueDomain(null);
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;

        const getLocalPosition = event => {
            const { width, height } = geometryRef.current;
            return {
                x: Math.min(
                    width,
                    Math.max(0, event.clientX - dragRef.current.rect.left)
                ),
                y: Math.min(
                    height,
                    Math.max(0, event.clientY - dragRef.current.rect.top)
                ),
            };
        };

        const handleMouseMove = event => {
            const drag = dragRef.current;
            if (!drag) return;
            const { width, height } = geometryRef.current;
            const position = getLocalPosition(event);
            const next = drag.mode === "move"
                ? {
                    left: Math.min(
                        Math.max(0, width - drag.width),
                        Math.max(0, position.x - drag.offsetX)
                    ),
                    top: Math.min(
                        Math.max(0, height - drag.height),
                        Math.max(0, position.y - drag.offsetY)
                    ),
                    width: Math.min(drag.width, width),
                    height: Math.min(drag.height, height),
                }
                : normalizeRectangle({
                    startX: drag.startX,
                    startY: drag.startY,
                    endX: position.x,
                    endY: position.y,
                    width,
                    height,
                });
            drag.latestRectangle = next;
            drag.moved = drag.moved || (
                Math.abs(position.x - drag.startPointerX) > 0 ||
                Math.abs(position.y - drag.startPointerY) > 0
            );
            selectionRef.current = next;
            setSelection(next);
            event.preventDefault();
        };

        const handleMouseUp = () => {
            const drag = dragRef.current;
            if (!drag) return;
            dragRef.current = null;
            setDragMode(null);
            const next = drag.latestRectangle;
            if (
                !drag.moved ||
                !next ||
                next.width < 8 ||
                next.height < 8
            ) {
                clear();
                return;
            }

            const geometry = geometryRef.current;
            const nextPoints = geometry.points.filter(point =>
                rectangleContainsPoint(next, point)
            );
            if (nextPoints.length === 0) {
                clear();
                return;
            }

            selectionRef.current = next;
            setSelection(next);
            setPoints(nextPoints);

            const drawableWidth = Math.max(geometry.width - 12, 1);
            const domainSpan = Math.max(
                geometry.domainMax - geometry.domainMin,
                0
            );
            const selectionStart = Math.min(
                drawableWidth,
                Math.max(0, next.left - 6)
            );
            const selectionEnd = Math.min(
                drawableWidth,
                Math.max(0, next.left + next.width - 6)
            );
            const domainStart = geometry.domainMin + (
                (selectionStart / drawableWidth) * domainSpan
            );
            const domainEnd = geometry.domainMin + (
                (selectionEnd / drawableWidth) * domainSpan
            );
            setValueDomain([
                Math.min(domainStart, domainEnd),
                Math.max(domainStart, domainEnd),
            ]);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [clear, enabled, geometryRef]);

    const handleMouseDown = useCallback(event => {
        if (!enabled || event.button !== 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const { width, height } = geometryRef.current;
        const startX = Math.min(
            width,
            Math.max(0, event.clientX - bounds.left)
        );
        const startY = Math.min(
            height,
            Math.max(0, event.clientY - bounds.top)
        );
        const current = selectionRef.current;
        const inside = current && rectangleContainsPoint(current, {
            x: startX,
            y: startY,
        });

        if (!inside) clear();

        setDragMode(inside ? "move" : "create");
        dragRef.current = {
            mode: inside ? "move" : "create",
            rect: bounds,
            startX,
            startY,
            startPointerX: startX,
            startPointerY: startY,
            offsetX: inside ? startX - current.left : 0,
            offsetY: inside ? startY - current.top : 0,
            width: inside ? current.width : 0,
            height: inside ? current.height : 0,
            latestRectangle: inside
                ? current
                : normalizeRectangle({
                    startX,
                    startY,
                    endX: startX,
                    endY: startY,
                    width,
                    height,
                }),
            moved: false,
        };
        event.preventDefault();
    }, [clear, enabled, geometryRef]);

    return {
        clear,
        handleMouseDown,
        dragMode,
        points,
        selection,
        valueDomain,
    };
};

export const RectangleDerivedChart = ({
    height,
    mode,
    placement = "inside",
    points,
    range,
    theme,
    tooltipId,
    tooltipLabel,
    tooltipKind,
    width,
    domainMin,
    domainMax,
}) => {
    if (!Array.isArray(points) || points.length === 0) return null;

    const rows = [];
    const rowByEntry = new Map();
    points.forEach(point => {
        if (!rowByEntry.has(point.entryIndex)) {
            const row = {
                entryIndex: point.entryIndex,
                label: point.label,
                record: point.record,
                points: [],
            };
            rowByEntry.set(point.entryIndex, row);
            rows.push(row);
        }
        rowByEntry.get(point.entryIndex).points.push(point);
    });

    const rowEntries = rows.map(row => [row.label, [row.record]]);
    const axisMargin = {
        top: 10,
        right: 6,
        bottom: 28,
        left: TEMPORAL_AXIS_GUTTER + 6,
    };
    const boundedWidth = Math.max(Number(width) || 0, 12) + TEMPORAL_AXIS_GUTTER;
    const plotWidth = Math.max(
        1,
        boundedWidth - axisMargin.left - axisMargin.right
    );
    const plotHeight = Math.max(
        1,
        height - axisMargin.top - axisMargin.bottom
    );
    const yPositions = getTemporalYPositions(
        rowEntries,
        mode,
        plotHeight
    ).map(position => position + axisMargin.top);
    const domainSpan = domainMax - domainMin;
    const getX = value => domainSpan > 0
        ? axisMargin.left + (((value - domainMin) / domainSpan) * plotWidth)
        : axisMargin.left + (plotWidth / 2);
    const xTicks = d3.ticks(domainMin, domainMax, 5).slice(0, 6);
    const yTickIndexes = Array.from(new Set(
        (rows.length <= 6
            ? rows.map((_, index) => index)
            : d3.ticks(0, rows.length - 1, 5).map(index => Math.round(index))
        ).filter(index => index >= 0 && index < rows.length)
    ));
    const axisColor = theme === "light" ? "#6c757d" : "#adb5bd";
    const axisTextColor = theme === "light" ? "#495057" : "#ced4da";
    const isFullWidth = placement === "full";
    const yTickLabel = index => {
        if (mode === "time") {
            if (index === 0) return "t=0";
            if (index === rows.length - 1) return "now";
        }
        return rows[index]?.record?.sequenceIndex ?? rows[index]?.entryIndex + 1;
    };
    const positionedPoints = rows.flatMap((row, rowIndex) =>
        row.points.map(point => ({
            ...point,
            x: getX(point.value),
            y: yPositions[rowIndex],
            rowIndex,
        }))
    );
    const endpointLines = ["low", "high"].flatMap(endpoint => {
        const endpointPoints = positionedPoints.filter(point =>
            point.endpoint === endpoint
        );
        return endpointPoints.slice(0, -1).map((point, index) => {
            const next = endpointPoints[index + 1];
            return {
                key: `${endpoint}-${point.entryIndex}-${next.entryIndex}`,
                x1: point.x,
                y1: point.y,
                x2: next.x,
                y2: next.y,
            };
        });
    });

    return (
        <div
            data-provenance-rectangle-derived="true"
            style={{
                ...rectangleZoomStyle,
                position: "relative",
                width: isFullWidth
                    ? "100%"
                    : `calc(100% + ${TEMPORAL_AXIS_GUTTER}px)`,
                height: `${height}px`,
                minHeight: `${height}px`,
                overflow: "hidden",
                marginLeft: isFullWidth
                    ? 0
                    : `-${TEMPORAL_AXIS_GUTTER}px`,
                order: 3,
            }}
        >
            <svg
                aria-hidden="true"
                width="100%"
                height={height}
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "visible",
                    pointerEvents: "none",
                }}
            >
                <line
                    x1={axisMargin.left}
                    y1={axisMargin.top + plotHeight}
                    x2={axisMargin.left + plotWidth}
                    y2={axisMargin.top + plotHeight}
                    stroke={axisColor}
                    strokeWidth="1"
                />
                <line
                    x1={axisMargin.left}
                    y1={axisMargin.top}
                    x2={axisMargin.left}
                    y2={axisMargin.top + plotHeight}
                    stroke={axisColor}
                    strokeWidth="1"
                />
                {xTicks.map(tick => {
                    const x = getX(tick);
                    return (
                        <g key={`derived-x-tick-${tick}`}>
                            <line
                                x1={x}
                                y1={axisMargin.top + plotHeight}
                                x2={x}
                                y2={axisMargin.top + plotHeight + 5}
                                stroke={axisColor}
                            />
                            <text
                                x={x}
                                y={axisMargin.top + plotHeight + 17}
                                fill={axisTextColor}
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {tick}
                            </text>
                        </g>
                    );
                })}
                {yTickIndexes.map(index => {
                    const y = yPositions[index];
                    return (
                        <g key={`derived-y-tick-${index}`}>
                            <line
                                x1={axisMargin.left - 5}
                                y1={y}
                                x2={axisMargin.left}
                                y2={y}
                                stroke={axisColor}
                            />
                            <text
                                x={axisMargin.left - 8}
                                y={y}
                                fill={axisTextColor}
                                fontSize="10"
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {yTickLabel(index)}
                            </text>
                        </g>
                    );
                })}
                <text
                    x={axisMargin.left + (plotWidth / 2)}
                    y={height - 3}
                    fill={axisTextColor}
                    fontSize="10"
                    textAnchor="middle"
                >
                    values
                </text>
                <text
                    x="10"
                    y={axisMargin.top + (plotHeight / 2)}
                    fill={axisTextColor}
                    fontSize="10"
                    textAnchor="middle"
                    transform={`rotate(-90 10 ${axisMargin.top + (plotHeight / 2)})`}
                >
                    interactions
                </text>
                {endpointLines.map(line => (
                    <line
                        key={line.key}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke={TEMPORAL_LINE_COLOR}
                        strokeWidth={TEMPORAL_LINE_WIDTH}
                    />
                ))}
            </svg>
            {positionedPoints.map((point, index) => {
                const value = point.value;
                const tooltipRecord = range
                    ? { ...point.record, value }
                    : point.record;
                const tooltipProps = getTooltipAnchorProps(
                    tooltipId,
                    () => formatTemporalTooltip({
                        label: tooltipLabel,
                        value,
                        record: tooltipRecord,
                        kind: tooltipKind,
                    }),
                    { focusable: false }
                );
                const relativeIndex = point.rowIndex / (rows.length - 1 || 1);
                const color = d3.interpolateOranges(
                    0.3 + (relativeIndex * 0.7)
                );
                return (
                    <div
                        key={`${point.entryIndex}-${point.endpoint ?? "low"}-${index}`}
                        {...tooltipProps}
                        style={{
                            ...tooltipProps.style,
                            position: "absolute",
                            left: `${point.x - 8}px`,
                            top: `${point.y - 8}px`,
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            backgroundColor: "transparent",
                            cursor: "help",
                            zIndex: 2,
                        }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                left: "4px",
                                top: "4px",
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: color,
                                border: `1px solid ${TEMPORAL_LINE_COLOR}`,
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};
