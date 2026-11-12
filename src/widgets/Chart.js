import TimelineVis from "./TimelineVis.js";
import { rectangleZoomStyle, styleZoomBrush } from "../shared/components/brushAppearance.js";
import {
    useCallback,
    useEffect,
    useRef,
    useMemo,
    useState,
} from "react";
import * as d3 from "d3";
import useProvenance from '../provenance/hooks/useProvenance.js';
import useProvenanceTooltip from '../provenance/hooks/useProvenanceTooltip.js';
import useWidgetRegistry from '../provenance/hooks/useWidgetRegistry.js';
import {
    formatTemporalTooltip,
    getTooltipAnchorProps,
} from '../shared/logic/provenanceTooltip.js';
import {
    buildTemporalSliderConnections,
    brushSelectionToPositionRange,
    filterTemporalEntries,
    getTemporalYPositions,
    normalizeTemporalBrush,
    TEMPORAL_LINE_COLOR,
    TEMPORAL_LINE_WIDTH,
    restoreTemporalPoint,
} from '../shared/logic/sliderTemporal.js';
import {
    brushSelectionToValueRange,
    getTemporalAutoZoomRange,
    resolveTemporalZoomActions,
    isTemporalZoomToolVisible,
    resolveTemporalZoomIn,
    getInputTextAutoZoomRange,
    getInputTextZoomDomain,
    resolveInputTextTemporalZoom,
    temporalTriggerMetric,
    resolveRecordTemporalView,
    getClippedTemporalYPositions,
    resolveSliderTemporalSmoothing,
} from "../shared/logic/scalability/index.js";
import {
    buildInputTextTemporalEntries,
    restoreInputTextTemporalValue,
} from '../shared/logic/inputTextValue.js';
import {
    buildSliderTicks,
    getSliderPosition,
} from '../shared/logic/sliderTicks.js';
import ZoomedRangeAxis, {
    ZOOM_AXIS_RIGHT_SPACE,
    ZOOM_AXIS_TOP_SPACE,
} from '../shared/components/ZoomedRangeAxis.js';
import SliderTemporalSmoothingCurve from '../shared/components/SliderTemporalSmoothingCurve.js';
import {
    RectangleDerivedChart,
    useRectangle2D,
} from './Rectangle2D.js';

const TEMPORAL_BRUSH_HEIGHT = 240;
// Keep the plot height stable as the interaction history grows.
const TEMPORAL_SLIDER_HEIGHT = 250;
// Text history uses a taller fixed plot without an inner scrollbar.
const INPUT_TEXT_TEMPORAL_HEIGHT = 440;
const TEMPORAL_ZOOM_BRUSH_CROSS_AXIS_SIZE = 32;

const TemporalBrush = ({
    height = TEMPORAL_BRUSH_HEIGHT,
    interactionLabels,
    interactive = true,
    mode,
    onInteractionStart,
    onRangeChange,
    offsetTop = 0,
    positions,
    range,
    syncRevision = 0,
    target,
    widgetType,
}) => {
    const brushRef = useRef(null);
    const brushInstanceRef = useRef(null);
    const entryCount = positions.length;
    const positionsKey = positions.join(",");
    const positionsRef = useRef(positions);
    positionsRef.current = positions;
    const rangeRef = useRef(range);
    rangeRef.current = range;

    useEffect(() => {
        if (!interactive || !brushRef.current || entryCount <= 1) return undefined;

        const updateRange = event => {
            const nextRange = brushSelectionToPositionRange(
                event.selection,
                positions
            );
            onRangeChange(nextRange);
            return nextRange;
        };
        const brush = d3
            .brushY()
            // Attach the brush to the y-axis and extend its hit area left.
            .extent([[-TEMPORAL_ZOOM_BRUSH_CROSS_AXIS_SIZE, 0], [0, height]])
            .on("start", () => onInteractionStart?.())
            .on("brush", updateRange)
            .on("end", event => {
                const range = updateRange(event);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent(
                        "provenance-widgets",
                        {
                            detail: {
                                id: target,
                                widget: widgetType,
                                mode,
                                interaction: "brush-end",
                                data: {
                                    selection: event.selection,
                                    range,
                                },
                            },
                        }
                    ));
                }
            });

        brushInstanceRef.current = brush;

        const brushGroup = d3.select(brushRef.current).call(brush);
        styleZoomBrush(brushGroup, "y");
        return () => {
            d3.select(brushRef.current).on(".brush", null);
            brushInstanceRef.current = null;
        };
    }, [
        entryCount,
        height,
        mode,
        onRangeChange,
        onInteractionStart,
        positionsKey,
        target,
        widgetType,
        interactive,
    ]);

    useEffect(() => {
        if (!interactive || !brushRef.current || !brushInstanceRef.current) {
            return;
        }
        const currentRange = rangeRef.current;
        if (!Array.isArray(currentRange)) {
            d3.select(brushRef.current).call(
                brushInstanceRef.current.move,
                null
            );
            return;
        }

        const start = Math.max(
            0,
            Math.min(positionsRef.current.length - 1, currentRange[0])
        );
        const end = Math.max(
            start,
            Math.min(positionsRef.current.length - 1, currentRange[1])
        );
        d3.select(brushRef.current).call(
            brushInstanceRef.current.move,
            [positionsRef.current[start], positionsRef.current[end]]
        );
    }, [interactive, positionsKey, syncRevision]);

    const tickStride = Math.max(1, Math.ceil(entryCount / 8));
    const ticks = positions
        .map((position, index) => ({ position, index, label: mode === "time" ? undefined : interactionLabels?.[index] }))
        .filter(({ index }) => (
            mode === "time"
                ? index === 0 || index === entryCount - 1
                : (
                    index % tickStride === 0 ||
                    index === entryCount - 1
                )
        ));
    return (
        <div
            style={{
                flex: "0 0 64px",
                width: "64px",
                marginTop: `${offsetTop}px`,
            }}
        >
            <svg
                aria-label={
                    interactive
                        ? `Drag vertically to zoom ${widgetType} history`
                        : `Complete ${widgetType} interaction range`
                }
                data-provenance-temporal-brush={target}
                width="64"
                height={height}
                style={{ display: "block", overflow: "visible" }}
            >
                <title>
                    {interactive
                        ? "Drag vertically to zoom; clear the selection to reset"
                        : "Complete interaction range"}
                </title>
                <text
                    x="10"
                    y={height / 2}
                    fill="#6c757d"
                    fontSize="11"
                    textAnchor="middle"
                    transform={
                        `rotate(-90 10 ${height / 2})`
                    }
                >
                    {`${mode === "time" ? "time" : "interaction"}${interactive ? " · drag to zoom" : ""}`}
                </text>
                <line
                    x1="58"
                    x2="58"
                    y1="0"
                    y2={height}
                    stroke="#6c757d"
                />
                {ticks.map(({ position, index, label }) => (
                    <g key={index}>
                        <line
                            x1="52"
                            x2="58"
                            y1={position}
                            y2={position}
                            stroke="#6c757d"
                        />
                        <text
                            x="49"
                            y={position}
                            dy="0.32em"
                            fill="#6c757d"
                            fontSize="10"
                            textAnchor="end"
                        >
                            {label ?? (mode === "time"
                                ? index === 0 ? "t=0" : "now"
                                : index)}
                        </text>
                    </g>
                ))}
                <g ref={brushRef} transform="translate(58,0)" />
            </svg>
        </div>
    );
};

const TemporalValueBrush = ({
    height = 64,
    interactive = true,
    max,
    min,
    step = 1,
    tickStep,
    ticksArray,
    showTicks = false,
    mode,
    onInteractionStart,
    onRangeChange,
    target,
    width,
    widgetType,
}) => {
    const brushRef = useRef(null);
    const ticks = showTicks
        ? buildSliderTicks({
            min,
            max,
            step: tickStep ?? step,
            ticksArray,
        })
        : [];

    useEffect(() => {
        if (!interactive || !brushRef.current || !Number.isFinite(width) || width <= 0) {
            return undefined;
        }

        const updateRange = event => {
            const range = brushSelectionToValueRange(
                event.selection,
                width,
                min,
                max,
                step
            );
            onRangeChange(range);
            return range;
        };
        const brush = d3
            .brushX()
            // Leave the caption below the brush, as on the vertical axis.
            .extent([
                [0, 0],
                [
                    width,
                    Math.max(1, height - TEMPORAL_ZOOM_BRUSH_CROSS_AXIS_SIZE),
                ],
            ])
            .on("start", () => onInteractionStart?.())
            .on("brush", updateRange)
            .on("end", event => {
                updateRange(event);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent(
                        "provenance-widgets",
                        {
                            detail: {
                                id: target,
                                widget: widgetType,
                                mode,
                                interaction: "value-brush-end",
                                data: { selection: event.selection },
                            },
                        }
                    ));
                }
            });

        const brushGroup = d3.select(brushRef.current).call(brush);
        styleZoomBrush(brushGroup, "x");

        return () => {
            d3.select(brushRef.current).on(".brush", null);
        };
    }, [
        height,
        interactive,
        max,
        min,
        mode,
        onInteractionStart,
        onRangeChange,
        step,
        target,
        widgetType,
        width,
    ]);

    return (
        <div
            data-provenance-values-brush={target}
            data-provenance-temporal-values-brush={target}
            style={{
                width: "100%",
                height: `${height}px`,
            }}
        >
            <svg
                aria-label={
                    interactive
                        ? `Drag horizontally to zoom ${widgetType} values`
                        : `Complete ${widgetType} value range`
                }
                width="100%"
                height={height}
                style={{ display: "block", overflow: "visible" }}
            >
                <title>
                    {interactive
                        ? "Drag horizontally to zoom values; clear the selection to reset"
                        : "Complete slider value range"}
                </title>
                <line x1="0" x2="100%" y1="8" y2="8" stroke="#6c757d" />
                <text
                    x="50%"
                    y={height - 4}
                    fill="#6c757d"
                    fontSize="11"
                    textAnchor="middle"
                >
                    {`values${interactive ? " · drag to zoom" : ""}`}
                </text>
                <g ref={brushRef} transform="translate(0,8)" />
                {ticks.map(value => {
                    const position = getSliderPosition(value, min, max);
                    return (
                        <g key={`value-tick-${value}`}>
                            <line
                                x1={`${position}%`}
                                x2={`${position}%`}
                                y1="8"
                                y2="16"
                                stroke="#6c757d"
                            />
                            <text
                                x={`${position}%`}
                                y="29"
                                fill="#6c757d"
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};


const Chart = ({
    target,
    part = "full",
    theme = "dark",
    provenance,
    provenanceStrategy,
    mode = "interaction",
    temporalBrush = true,
    scalability,
    widgetWidth = 0,
    sliderStep = 1,
    sliderShowTicks = false,
    sliderTickStep,
    sliderTicksArray,
}) => {
    const chartRef = useRef(null);
    const [registeredComponents] = useProvenance();
    const { restoreWidgetValue } = useWidgetRegistry();
    const tooltipId = useProvenanceTooltip();
    const [brushRange, setBrushRange] = useState(null);
    const [brushSyncRevision, setBrushSyncRevision] = useState(0);
    const [valueBrushRange, setValueBrushRange] = useState(null);
    const [valueBrushWidth, setValueBrushWidth] = useState(0);
    const valueBrushContainerRef = useRef(null);
    const rectangleGeometryRef = useRef({
        width: 0,
        height: 0,
        points: [],
        domainMin: 0,
        domainMax: 1,
    });
    const temporalZoom = useMemo(
        () => resolveTemporalZoomIn(scalability),
        [scalability]
    );
    const temporalZoomKey = [
        temporalZoom.enabled,
        temporalZoom.modes.join(","),
        temporalZoom.visibility,
        temporalZoom.trigger.type ?? "",
        temporalZoom.trigger.threshold ?? "",
        temporalZoom.trigger.auto_zoom ?? "",
    ].join("|");
    const rectangleConfigured =
        temporalZoom.enabled &&
        temporalZoom.modes.includes("interactions-values");
    const {
        clear: clearRectangleSelection,
        handleMouseDown: handleRectangleMouseDown,
        dragMode: rectangleDragMode,
        points: rectanglePoints,
        selection: rectangleSelection,
        valueDomain: rectangleValueDomain,
    } = useRectangle2D({
        enabled: rectangleConfigured,
        geometryRef: rectangleGeometryRef,
    });
    const previousTemporalEntryCountRef = useRef(0);
    const autoZoomTriggeredRef = useRef(false);
    const lastTemporalMetricRef = useRef(null);
    const handleBrushRangeChange = useCallback(
        range => {
            clearRectangleSelection();
            setBrushRange(currentRange => (
                Array.isArray(currentRange) &&
                Array.isArray(range) &&
                currentRange[0] === range[0] &&
                currentRange[1] === range[1]
                    ? currentRange
                    : range
            ));
        },
        [clearRectangleSelection]
    );
    const handleValueBrushRangeChange = useCallback(
        range => {
            clearRectangleSelection();
            setValueBrushRange(currentRange => (
                Array.isArray(currentRange) &&
                Array.isArray(range) &&
                currentRange[0] === range[0] &&
                currentRange[1] === range[1]
                    ? currentRange
                    : range
            ));
        },
        [clearRectangleSelection]
    );

    useEffect(() => {
        setBrushRange(null);
        setValueBrushRange(null);
        clearRectangleSelection();
        setBrushSyncRevision(revision => revision + 1);
        previousTemporalEntryCountRef.current = 0;
        lastTemporalMetricRef.current = null;
        autoZoomTriggeredRef.current = false;
    }, [clearRectangleSelection, target, temporalBrush, temporalZoomKey]);

    useEffect(() => {
        const element = valueBrushContainerRef.current;
        if (!element) return undefined;
        const updateWidth = () => setValueBrushWidth(element.clientWidth);
        updateWidth();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateWidth);
            return () => window.removeEventListener("resize", updateWidth);
        }
        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
    }, [
        provenance,
        provenanceStrategy,
        registeredComponents,
        scalability,
        target,
        temporalBrush,
    ]);
    
    const sourceChartData = useMemo(() => {
        if (!target) return null;

        const componentData = provenanceStrategy ?? (
            registeredComponents instanceof Map
                ? registeredComponents.get(target)
                : registeredComponents?.[target]
        );
        if (!componentData) return null;

        const domain = componentData.domain instanceof Map
            ? componentData.domain
            : componentData.domain
                ? new Map(Object.entries(componentData.domain))
                : null;
        
        const indexDomain = domain?.get
            ? domain.get("index")
            : domain?.index;

        const detailedDataEntries = componentData.detailedData instanceof Map
            ? Array.from(componentData.detailedData.entries())
            : componentData.detailedData && typeof componentData.detailedData.entries === 'function'
                ? Array.from(componentData.detailedData.entries())
                : Array.isArray(componentData.detailedData)
                    ? componentData.detailedData.map((v, i) => [i, v])
                    : [];

        let isCheckboxGroup = false;

        if (detailedDataEntries.length > 0) {
            const firstEntry = detailedDataEntries[0];
            const firstKey = firstEntry[0];
            const firstValue = firstEntry[1];
            if (typeof firstKey === 'string' && 
                Array.isArray(firstValue) && 
                firstValue.length > 0 && 
                firstValue[0]?.select) {
                isCheckboxGroup = true;
            }
        }
        
        let isRangedProvenance = false;
        if (detailedDataEntries.length > 0) {
            const val = detailedDataEntries[0][1];
            if (val && typeof val === 'object' && 'value' in val && Array.isArray(val.value) && val.value.length === 2 && typeof val.value[0] === 'number') {
                isRangedProvenance = true;
            }
        }
        
        let isTextProvenance = false;
        let isNumericProvenance = false;
        
        if (detailedDataEntries.length > 0) {
            const val = detailedDataEntries[0][1];
            if (val && typeof val === 'object' && 'value' in val && typeof val.value === 'string' && !Array.isArray(val)) {
                isTextProvenance = true;
            }
            if (val && typeof val === 'object' && 'value' in val && typeof val.value === 'number' && !Array.isArray(val)) {
                isNumericProvenance = true;
            }
        }

        if (isRangedProvenance) {
            const publicRecords =
                provenance?.widgetType === "range-slider" &&
                Array.isArray(provenance.data)
                    ? provenance.data.map((record, index) => [
                        index + 1,
                        {
                            value: record.value,
                            time: new Date(record.timestamp),
                            index: index + 1,
                            kind: record.kind,
                            source: record.source,
                        },
                    ])
                    : [];
            const sorted = (
                publicRecords.length > 0
                    ? publicRecords
                    : detailedDataEntries
            ).sort((a, b) => a[0] - b[0]);
            const sequenceOffset = componentData.tooltipIndexOffset ?? 0;
            const hasRecordKinds = sorted.some(
                ([, record]) => record.kind !== undefined
            );
            const sequenceTotal = hasRecordKinds
                ? sorted.filter(
                    ([, record]) => record.kind === "interaction"
                ).length
                : Math.max(0, sorted.length - sequenceOffset);
            let interactionIndex = 0;
            const transformedData = sorted.map(([, record]) => {
                if (
                    record.kind === undefined ||
                    record.kind === "interaction"
                ) {
                    interactionIndex += 1;
                }
                const label = String(record.index);
                const min = record.value[0];
                const max = record.value[1];
                return [label, [{
                    select: { index: min, time: record.time },
                    unselect: { index: max },
                    value: record.value,
                    time: record.time,
                    kind: record.kind,
                    source: record.source,
                    sequenceIndex: hasRecordKinds
                        ? interactionIndex
                        : Math.max(
                            0,
                            record.index - sequenceOffset
                        ),
                    sequenceTotal,
                }]];
            });
            
            let min = 0;
            let max = 100;
            if (componentData.minValue !== undefined) min = componentData.minValue;
            if (componentData.maxValue !== undefined) max = componentData.maxValue;
            
            return {
                componentData,
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isRangeSlider: true,
                tooltipKind: 'range',
                tooltipLabel: componentData.tooltipLabel ?? target,
                mode,
            };
        }

        if (isTextProvenance) {
            const publicRecords =
                provenance?.widgetType === "input-text" &&
                Array.isArray(provenance.data)
                    ? provenance.data.map((record, recordIndex) => [
                        recordIndex + 1,
                        {
                            value: record.value,
                            time: new Date(record.timestamp),
                            index: recordIndex + 1,
                            kind: record.kind,
                            source: record.source,
                        },
                    ])
                    : [];
            const sorted = (
                publicRecords.length > 0
                    ? publicRecords
                    : detailedDataEntries
            ).sort((a, b) => a[0] - b[0]);
            const grouped = new Map();
            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const hasRecordKinds = sorted.some(
                ([, record]) => record.kind !== undefined
            );
            const sequenceTotal = hasRecordKinds
                ? sorted.filter(
                    ([, record]) => record.kind === "interaction"
                ).length
                : Math.max(0, sorted.length - sequenceOffset);
            let interactionIndex = 0;
            const inputTextEntries = buildInputTextTemporalEntries({
                sortedRecords: sorted,
                hasRecordKinds,
                sequenceOffset,
                sequenceTotal,
            });

            if (sorted.length > 0) {
                const firstRecord = sorted[0][1];
                let currentVal = firstRecord.value;
                const startIndex = firstRecord.index;
                const startPosition = mode === "time"
                    ? firstRecord.time.getTime()
                    : firstRecord.index;
                if (
                    firstRecord.kind === undefined ||
                    firstRecord.kind === "interaction"
                ) {
                    interactionIndex += 1;
                }

                if (!grouped.has(currentVal)) grouped.set(currentVal, []);
                grouped.get(currentVal).push({
                    select: {
                        index: startPosition,
                        time: firstRecord.time,
                    },
                    value: currentVal,
                    time: firstRecord.time,
                    kind: firstRecord.kind,
                    source: firstRecord.source,
                    sequenceIndex: hasRecordKinds
                        ? interactionIndex
                        : Math.max(
                            0,
                            startIndex - sequenceOffset
                        ),
                    sequenceTotal,
                });

                for (let i = 1; i < sorted.length; i++) {
                    const nextRec = sorted[i][1];
                    const nextVal = nextRec.value;
                    const nextIndex = nextRec.index;
                    const nextPosition = mode === "time"
                        ? nextRec.time.getTime()
                        : nextIndex;
                    if (
                        nextRec.kind === undefined ||
                        nextRec.kind === "interaction"
                    ) {
                        interactionIndex += 1;
                    }

                    // Every search is a separate PW interaction, even when the
                    // same value is searched twice in succession.
                    const currentRecords = grouped.get(currentVal);
                    if (currentRecords && currentRecords.length > 0) {
                        currentRecords[currentRecords.length - 1].unselect = {
                            index: nextPosition,
                            time: nextRec.time,
                        };
                    }

                    if (!grouped.has(nextVal)) grouped.set(nextVal, []);
                    grouped.get(nextVal).push({
                        select: {
                            index: nextPosition,
                            time: nextRec.time,
                        },
                        value: nextVal,
                        time: nextRec.time,
                        kind: nextRec.kind,
                        source: nextRec.source,
                        sequenceIndex: hasRecordKinds
                            ? interactionIndex
                            : Math.max(
                                0,
                                nextIndex - sequenceOffset
                            ),
                        sequenceTotal,
                    });

                    currentVal = nextVal;
                }
            }

            let dataMaxIndex = 0;
            if (sorted.length > 0) {
                dataMaxIndex = sorted[sorted.length - 1][1].index;
            }
            
            const currentDomainMax = indexDomain ? indexDomain[1] : 0;
            const temporalPositions = mode === "time"
                ? sorted.map(([, record]) => record.time.getTime())
                : [];
            const temporalMin = temporalPositions.length > 0
                ? Math.min(...temporalPositions)
                : 0;
            const temporalMax = temporalPositions.length > 0
                ? Math.max(...temporalPositions)
                : 0;
            const effectiveMax = Math.max(currentDomainMax, dataMaxIndex);
            const textDomain = mode === "time"
                ? [
                    temporalMin,
                    temporalMax > temporalMin
                        ? temporalMax
                        : temporalMin + 1,
                ]
                : [0, effectiveMax];

            return {
                componentData,
                detailedDataEntries: Array.from(grouped.entries()),
                inputTextEntries,
                indexDomain: textDomain,
                isCheckboxGroup: true,
                isInputText: true,
                tooltipKind: 'input',
                tooltipLabel: componentData.tooltipLabel ?? target,
                mode,
            };
        }

        if (isNumericProvenance) {
            const publicRecords =
                provenance?.widgetType === "single-slider" &&
                Array.isArray(provenance.data)
                    ? provenance.data.map((record, index) => [
                        index + 1,
                        {
                            value: record.value,
                            time: new Date(record.timestamp),
                            index: index + 1,
                            kind: record.kind,
                            source: record.source,
                        },
                    ])
                    : [];
            const sorted = (
                publicRecords.length > 0
                    ? publicRecords
                    : detailedDataEntries
            ).sort((a, b) => a[0] - b[0]);

            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const hasRecordKinds = sorted.some(([, record]) => record.kind !== undefined);
            const sequenceTotal = hasRecordKinds
                ? sorted.filter(([, record]) => record.kind === "interaction").length
                : Math.max(0, sorted.length - sequenceOffset);
            let interactionIndex = 0;
            const transformedData = sorted.map(([, record]) => {
                if (
                    record.kind === undefined ||
                    record.kind === "interaction"
                ) {
                    interactionIndex += 1;
                }
                const key = String(record.index);
                const v = record.value;
                return [key, [{
                    select: { index: v, time: record.time },
                    value: v,
                    time: record.time,
                    kind: record.kind,
                    source: record.source,
                    sequenceIndex: hasRecordKinds
                        ? interactionIndex
                        : Math.max(0, interactionIndex - sequenceOffset),
                    sequenceTotal: Math.max(0, sequenceTotal),
                }]];
            });

            const min = componentData.minValue ?? 0;
            const max = componentData.maxValue ?? 100;

            return {
                componentData,
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isSingleSlider: true,
                tooltipKind: 'slider',
                tooltipLabel: componentData.tooltipLabel ?? target,
                mode,
            };
        }

        const tooltipKind = typeof target === 'string' && (
            target.includes('checkbox') || target.includes('multi')
        ) ? 'multi-selection' : 'single-selection';

        return {
            componentData,
            detailedDataEntries,
            indexDomain,
            isCheckboxGroup,
            tooltipKind,
            tooltipLabel: componentData.tooltipLabel ?? target,
        };
    }, [
        target,
        registeredComponents,
        provenance,
        provenanceStrategy,
        mode,
    ]);

    const clipping = useMemo(() => resolveRecordTemporalView({
        entries: sourceChartData?.isInputText
            ? sourceChartData.inputTextEntries
            : sourceChartData?.isSingleSlider || sourceChartData?.isRangeSlider
                ? sourceChartData.detailedDataEntries
                : [],
        scalability,
        width: widgetWidth,
        mode,
    }), [sourceChartData, scalability, widgetWidth, mode]);
    const chartData = useMemo(() => {
        if (!clipping.enabled || !sourceChartData) return sourceChartData;
        if (sourceChartData.isInputText) {
            return { ...sourceChartData, inputTextEntries: clipping.entries };
        }
        if (sourceChartData.isSingleSlider || sourceChartData.isRangeSlider) {
            return { ...sourceChartData, detailedDataEntries: clipping.entries };
        }
        return sourceChartData;
    }, [sourceChartData, clipping]);
    const inputTextZoom = useMemo(() => resolveInputTextTemporalZoom({
        entries: chartData?.isInputText
            ? chartData.inputTextEntries
            : [],
        config: temporalZoom,
        temporalBrush: normalizeTemporalBrush(temporalBrush),
    }), [chartData, temporalBrush, temporalZoom]);

    useEffect(() => {
        setBrushRange(null);
        setValueBrushRange(null);
        clearRectangleSelection();
        setBrushSyncRevision(revision => revision + 1);
    }, [clipping.resetKey, clearRectangleSelection]);

    useEffect(() => {
        const isTemporalSlider = chartData?.isCheckboxGroup && (
            chartData.isSingleSlider || chartData.isRangeSlider
        );
        const isTemporalInputText = Boolean(
            chartData?.isInputText && inputTextZoom.enabled
        );
        const isTemporalRecordChart =
            isTemporalSlider || isTemporalInputText;
        const entries = isTemporalSlider
            ? chartData.detailedDataEntries
            : isTemporalInputText
                ? chartData.inputTextEntries
                : [];
        const triggerEntries = isTemporalInputText
            ? inputTextZoom.triggerEntries
            : entries;
        const entryCount = isTemporalRecordChart ? entries.length : 0;
        const previousEntryCount = previousTemporalEntryCountRef.current;
        const historyReset = entryCount < previousEntryCount;
        const currentMetric = temporalTriggerMetric(
            triggerEntries,
            temporalZoom.trigger.type
        );
        const { shouldAutoZoom } = resolveTemporalZoomActions({
            entries: triggerEntries,
            trigger: temporalZoom.trigger,
            previousMetric: historyReset
                ? 0
                : lastTemporalMetricRef.current,
            enabled: isTemporalInputText
                ? inputTextZoom.enabled && temporalZoom.visibility !== "off"
                : isTemporalSlider && normalizeTemporalBrush(temporalBrush) &&
                    temporalZoom.enabled && temporalZoom.modes.includes("interactions"),
            alreadyAutoZoomed: historyReset
                ? false
                : autoZoomTriggeredRef.current,
        });

        if (historyReset) {
            setBrushRange(null);
            clearRectangleSelection();
            autoZoomTriggeredRef.current = false;
            lastTemporalMetricRef.current = null;
        }

        if (shouldAutoZoom) {
            autoZoomTriggeredRef.current = true;
            setBrushRange(isTemporalInputText
                ? getInputTextAutoZoomRange(entries, temporalZoom.trigger)
                : getTemporalAutoZoomRange(entries, temporalZoom.trigger));
            setBrushSyncRevision(revision => revision + 1);
        } else if (historyReset) {
            setBrushSyncRevision(revision => revision + 1);
        } else if (entryCount > previousEntryCount) {
            clearRectangleSelection();
            setBrushRange(currentRange => {
                if (
                    !Array.isArray(currentRange) ||
                    currentRange.length !== 2 ||
                    previousEntryCount <= 0
                ) {
                    return currentRange;
                }

                // Keep a window that was anchored at "now" anchored to the
                // new latest interaction without growing its interaction
                // count. A window ending earlier remains a fixed historical
                // slice.
                const wasAnchoredAtEnd =
                    currentRange[1] >= previousEntryCount - 1;
                if (!wasAnchoredAtEnd) return currentRange;

                const windowSpan = Math.max(
                    0,
                    currentRange[1] - currentRange[0]
                );
                const nextEnd = entryCount - 1;
                const nextStart = Math.max(0, nextEnd - windowSpan);
                return [nextStart, nextEnd];
            });
            setBrushSyncRevision(revision => revision + 1);
        }

        previousTemporalEntryCountRef.current = entryCount;
        lastTemporalMetricRef.current = currentMetric;
    }, [
        chartData,
        clearRectangleSelection,
        inputTextZoom,
        temporalBrush,
        temporalZoom,
        temporalZoomKey,
    ]);

    if (!chartData) return null;

    if (chartData.isCheckboxGroup) {
        const { detailedDataEntries, indexDomain } = chartData;
        
        const allSortedEntries = chartData.isRangeSlider || chartData.isSingleSlider
            ? [...detailedDataEntries]
            : [...detailedDataEntries].sort((a, b) => a[0].localeCompare(b[0]));
        const brushEnabled =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush) &&
            allSortedEntries.length > 1 &&
            temporalZoom.enabled &&
            temporalZoom.modes.includes("interactions") &&
            isTemporalZoomToolVisible({
                entries: allSortedEntries,
                visibility: temporalZoom.visibility,
                trigger: temporalZoom.trigger,
            });
        const valueBrushEnabled =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush) &&
            temporalZoom.enabled &&
            temporalZoom.modes.includes("values") &&
            isTemporalZoomToolVisible({
                entries: allSortedEntries,
                visibility: temporalZoom.visibility,
                trigger: temporalZoom.trigger,
            });
        const rectangleToolEnabled =
            rectangleConfigured &&
            normalizeTemporalBrush(temporalBrush) &&
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            isTemporalZoomToolVisible({
                entries: allSortedEntries,
                visibility: temporalZoom.visibility,
                trigger: temporalZoom.trigger,
            });
        const showInteractionAxis =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush);
        const showValueAxis =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush);
        const reserveValueZoomAxisSpace =
            showValueAxis &&
            temporalZoom.enabled &&
            temporalZoom.modes.includes("values");
        const reserveInteractionZoomAxisSpace =
            showInteractionAxis &&
            temporalZoom.enabled &&
            temporalZoom.modes.includes("interactions");
        const sortedEntries = brushEnabled
            ? filterTemporalEntries(allSortedEntries, brushRange)
            : allSortedEntries;
        const temporalPlotHeight = brushEnabled
            ? TEMPORAL_BRUSH_HEIGHT
            : TEMPORAL_SLIDER_HEIGHT;
        const temporalYPositions = getTemporalYPositions(
            sortedEntries,
            chartData.mode ?? mode,
            temporalPlotHeight
        );
        const brushYPositions = getTemporalYPositions(
            allSortedEntries,
            chartData.mode ?? mode,
            temporalPlotHeight
        );
        const allInputTextEntries = chartData.inputTextEntries ?? [];
        const inputTextBrushEnabled =
            !clipping.enabled &&
            inputTextZoom.visible;
        const reserveInputTextZoomAxisSpace = inputTextZoom.enabled;
        const inputTextEntries = inputTextBrushEnabled
            ? filterTemporalEntries(allInputTextEntries, brushRange)
            : allInputTextEntries;
        const inputTextPlotHeight = INPUT_TEXT_TEMPORAL_HEIGHT;
        const inputTextYPositions = clipping.enabled
            ? getClippedTemporalYPositions(clipping, inputTextPlotHeight)
            : getTemporalYPositions(
                inputTextEntries,
                mode,
                inputTextPlotHeight
            );
        const inputTextBrushYPositions = clipping.enabled
            ? inputTextYPositions
            : getTemporalYPositions(
                allInputTextEntries,
                mode,
                inputTextPlotHeight
            );
        const inputTextZoomDomain = inputTextBrushEnabled
            ? getInputTextZoomDomain(
                allInputTextEntries,
                brushRange,
                mode
            )
            : null;
        
        let calculatedMax = 0;
        for (const [, records] of sortedEntries) {
            for (const record of records) {
                if (record.select?.index > calculatedMax) calculatedMax = record.select.index;
                if (record.unselect?.index > calculatedMax) calculatedMax = record.unselect.index;
            }
        }
        
        const domainMax = indexDomain ? indexDomain[1] : 0;
        const domainMin = indexDomain ? indexDomain[0] : 0;
        const valueDomainMin = valueBrushRange?.[0] ?? domainMin;
        const valueDomainMax = valueBrushRange?.[1] ?? domainMax;
        const interactionZoomRange = (
            Array.isArray(brushRange) &&
            brushRange.length === 2 &&
            allSortedEntries.length > 0
        )
            ? [brushRange[0], brushRange[1]].map(index => {
                const clampedIndex = Math.max(0, Math.min(
                    allSortedEntries.length - 1,
                    index
                ));
                return allSortedEntries[clampedIndex][1][0].sequenceIndex;
            })
            : null;
        const usesContinuousDomain =
            chartData.isRangeSlider ||
            chartData.isSingleSlider ||
            (
                chartData.isInputText &&
                (chartData.mode ?? mode) === "time"
            );
        const baseMaxIndex = usesContinuousDomain
            ? domainMax
            : Math.max(domainMax, calculatedMax, 1);
        const maxIndex = usesContinuousDomain
            ? baseMaxIndex
            : baseMaxIndex + 1;
        const minIndex = usesContinuousDomain ? domainMin : 0;
        const rangeSpan = Math.max(valueDomainMax - valueDomainMin, 1e-9);
        const temporalSmoothing = chartData.isSingleSlider || chartData.isRangeSlider
            ? resolveSliderTemporalSmoothing({
                scalability,
                entries: sortedEntries,
                mode: chartData.mode ?? mode,
                range: chartData.isRangeSlider,
                min: domainMin,
                max: domainMax,
            })
            : { active: false, method: "savgol", samples: [] };
        const temporalSmoothingStops = temporalSmoothing.samples.map((sample, index) => ({
            offset: sample.offset,
            color: d3.interpolateOranges(
                0.3 + ((index / (temporalSmoothing.samples.length - 1 || 1)) * 0.7)
            ),
        }));
        const temporalSliderConnections = buildTemporalSliderConnections({
            entries: sortedEntries,
            yPositions: temporalYPositions,
            domainMin: valueDomainMin,
            domainMax: valueDomainMax,
            range: chartData.isRangeSlider,
        });

        const rectanglePointData = [];
        if (chartData.isRangeSlider || chartData.isSingleSlider) {
            sortedEntries.forEach(([label, records], entryIndex) => {
                records.forEach(record => {
                    if (!record?.select) return;
                    const addPoint = (endpoint, value) => {
                        if (!Number.isFinite(Number(value))) return;
                        const x = 6 + (
                            ((Number(value) - valueDomainMin) / rangeSpan) *
                            Math.max(valueBrushWidth - 12, 1)
                        );
                        rectanglePointData.push({
                            entryIndex,
                            endpoint,
                            label,
                            record,
                            value: Number(value),
                            x,
                            y: temporalYPositions[entryIndex],
                        });
                    };
                    if (chartData.isRangeSlider) {
                        const lowValue = Array.isArray(record.value)
                            ? record.value[0]
                            : record.select.index;
                        const highValue = Array.isArray(record.value)
                            ? record.value[1]
                            : record.unselect?.index ?? maxIndex;
                        addPoint("low", lowValue);
                        addPoint("high", highValue);
                    } else {
                        addPoint(
                            "low",
                            Array.isArray(record.value)
                                ? record.value[0]
                                : record.value ?? record.select.index
                        );
                    }
                });
            });
        }

        rectangleGeometryRef.current = {
            width: valueBrushWidth,
            height: temporalPlotHeight,
            points: rectanglePointData,
            domainMin: valueDomainMin,
            domainMax: valueDomainMax,
        };

        const isLight = theme === "light";
        const bgColor = isLight ? "#fff" : "#333";
        const textColor = isLight ? "#000" : "#eee"; // Or white
        const axisColor = isLight ? "#ccc" : "#555";
        const labelColor = isLight ? "#333" : "#ccc"; // For n=0, now labels

        const renderHeader = () => {
            if (chartData.isInputText) return null;
            const hasLeftAxisLabel = chartData.isRangeSlider || chartData.isSingleSlider;
            const brushWidth = showInteractionAxis ? 64 : 0;
            const leftLabelWidth = hasLeftAxisLabel
                ? showInteractionAxis ? brushWidth : 28
                : 0;
            // TemporalBrush already occupies the complete body gutter. The
            // compact vertical label is the only variant with an 8px gap.
            const leftLabelGap = hasLeftAxisLabel && !showInteractionAxis ? 8 : 0;
            const plotInset = hasLeftAxisLabel ? 6 : 0;
            const totalLeftGutter = leftLabelWidth + leftLabelGap + plotInset;
            const totalRightInset = plotInset;
            const innerWidthCalc = `calc(100% - ${totalLeftGutter + totalRightInset}px)`;
            const innerMarginLeft = `${totalLeftGutter}px`;
            return (<div></div>)
            return (
                <div
                    data-provenance-chart-target={target}
                    style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '8px' }}
                >
                    <div data-timeline-axis={target} style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, height: '4px', background: axisColor, borderRadius: '2px', position: 'relative' }}></div>
                    <div style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold', transform: hasLeftAxisLabel ? 'translateX(-50%)' : undefined }}>
                           {chartData.isInputText &&
                           (chartData.mode ?? mode) === "time"
                               ? "t=0"
                               : (
                                   chartData.isRangeSlider ||
                                   chartData.isSingleSlider
                               )
                                   ? valueDomainMin
                                   : "n=0"}
                        </span>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold', transform: hasLeftAxisLabel ? 'translateX(50%)' : undefined }}>
                           {chartData.isRangeSlider ||
                           chartData.isSingleSlider
                               ? valueDomainMax
                               : "now"}
                        </span>
                    </div>
                </div>
            );
        };

        const renderInputTextBody = () => (
            <div
                data-provenance-chart-target={target}
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    height: `${inputTextPlotHeight}px`,
                    overflow: "visible",
                }}
            >
                <TemporalBrush
                    interactive={inputTextBrushEnabled}
                    interactionLabels={allInputTextEntries.map(
                        ([, records], index) =>
                            records[0]?.sequenceIndex ?? index
                    )}
                    range={inputTextBrushEnabled ? brushRange : null}
                    syncRevision={brushSyncRevision}
                    height={inputTextPlotHeight}
                    mode={mode}
                    onInteractionStart={clearRectangleSelection}
                    onRangeChange={handleBrushRangeChange}
                    positions={inputTextBrushYPositions}
                    target={target}
                    widgetType="input-text"
                />
                <div
                    style={{
                        position: "relative",
                        flex: 1,
                        minWidth: 0,
                        height: `${inputTextPlotHeight}px`,
                        paddingRight: reserveInputTextZoomAxisSpace
                            ? `${ZOOM_AXIS_RIGHT_SPACE}px`
                            : undefined,
                        boxSizing: "border-box",
                    }}
                >
                    {inputTextZoomDomain && (
                        <ZoomedRangeAxis
                            domain={inputTextZoomDomain}
                            label={mode === "time"
                                ? "Selected time range"
                                : "Selected interaction range"}
                            orientation="vertical"
                            pixelLength={inputTextPlotHeight}
                            positionedTicks={mode !== "time"
                                ? inputTextEntries.map(([, records], index) => ({
                                    value: records[0].sequenceIndex,
                                    position: inputTextYPositions[index],
                                }))
                                : undefined}
                            step={mode === "time" ? undefined : 1}
                            integerTicks={mode !== "time"}
                            theme={theme}
                            topInset={0}
                            formatTick={value => (
                                `${Number(Number(value).toFixed(2))}${
                                    mode === "time" ? "s" : ""
                                }`
                            )}
                        />
                    )}
                    {inputTextEntries.map(([, records], index) => {
                        const record = records[0];
                        const value = record.value;
                        const relativeIndex =
                            index /
                            (inputTextEntries.length - 1 || 1);
                        const color = d3.interpolateOranges(
                            0.3 + (relativeIndex * 0.7)
                        );
                        const tooltipProps = getTooltipAnchorProps(
                            tooltipId,
                            () => formatTemporalTooltip({
                                label: chartData.tooltipLabel,
                                value,
                                record,
                                kind: "input",
                            })
                        );

                        return (
                            <div
                                key={`${index}-${value}`}
                                style={{
                                    position: "absolute",
                                    top:
                                        `${inputTextYPositions[index] - 12}px`,
                                    left: 0,
                                    right: reserveInputTextZoomAxisSpace
                                        ? `${ZOOM_AXIS_RIGHT_SPACE}px`
                                        : 0,
                                    height: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <button
                                    {...tooltipProps}
                                    type="button"
                                    data-provenance-temporal-value={
                                        value
                                    }
                                    aria-label={
                                        `Restore ${chartData.tooltipLabel} ` +
                                        `to ${value === ""
                                            ? "<empty>"
                                            : value}`
                                    }
                                    onClick={() =>
                                        restoreInputTextTemporalValue({
                                            restoreWidgetValue,
                                            target,
                                            value,
                                        })
                                    }
                                    style={{
                                        ...tooltipProps.style,
                                        position: "relative",
                                        flex: "0 0 16px",
                                        width: "16px",
                                        height: "16px",
                                        margin: "0 8px 0 4px",
                                        padding: 0,
                                        borderRadius: "50%",
                                        border:
                                            `1px solid ${d3
                                                .color(color)
                                                .darker()}`,
                                        backgroundColor: color,
                                        cursor: "pointer",
                                        opacity:
                                            record.kind === "sample"
                                                ? 0.7
                                                : 1,
                                    }}
                                />
                                <span
                                    title={value}
                                    style={{
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        fontSize: "12px",
                                        color: textColor,
                                    }}
                                >
                                    {value === "" ? "<empty>" : value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );

        const renderBody = () => chartData.isInputText
            ? renderInputTextBody()
            : (
             <>
             <div
                 data-provenance-chart-target={target}
                 style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}
             >
                 {showInteractionAxis && (
                     <TemporalBrush
                         interactionLabels={allSortedEntries.map(([, records]) => records[0]?.sequenceIndex)}
                         height={temporalPlotHeight}
                         interactive={brushEnabled}
                         mode={chartData.mode ?? mode}
                         onInteractionStart={clearRectangleSelection}
                         onRangeChange={handleBrushRangeChange}
                         offsetTop={reserveValueZoomAxisSpace
                             ? ZOOM_AXIS_TOP_SPACE
                             : 0}
                         positions={brushYPositions}
                         range={brushRange}
                         syncRevision={brushSyncRevision}
                         target={target}
                         widgetType={
                             chartData.isRangeSlider
                                 ? "range-slider"
                                 : "single-slider"
                         }
                     />
                 )}
                 <div style={{
                     display: 'flex',
                     flexDirection: 'column',
                     gap: '8px',
                     maxHeight: chartData.isRangeSlider || chartData.isSingleSlider
                         ? 'none'
                         : '300px',
                     overflowY: chartData.isRangeSlider || chartData.isSingleSlider
                         ? 'visible'
                         : 'auto',
                     flexGrow: 1,
                     position: 'relative',
                     paddingTop: reserveValueZoomAxisSpace
                         ? `${ZOOM_AXIS_TOP_SPACE}px`
                         : undefined,
                     paddingRight: reserveInteractionZoomAxisSpace
                         ? `${ZOOM_AXIS_RIGHT_SPACE}px`
                         : undefined,
                     boxSizing: 'border-box',
                 }}>
                 {valueBrushEnabled && Array.isArray(valueBrushRange) && (
                     <ZoomedRangeAxis
                         domain={valueBrushRange}
                         label="Selected slider value range"
                         orientation="horizontal"
                         pixelLength={valueBrushWidth}
                         step={sliderTickStep ?? sliderStep}
                         minimumStep={sliderStep}
                         ticksArray={sliderTicksArray}
                         theme={theme}
                         rightInset={reserveInteractionZoomAxisSpace
                             ? ZOOM_AXIS_RIGHT_SPACE
                             : 0}
                     />
                 )}
                 {brushEnabled && interactionZoomRange && (
                     <ZoomedRangeAxis
                         domain={interactionZoomRange}
                         label="Selected interaction range"
                         orientation="vertical"
                         pixelLength={temporalPlotHeight}
                         positionedTicks={sortedEntries.map(([, records], index) => ({
                             value: records[0].sequenceIndex,
                             position: temporalYPositions[index],
                         }))}
                         step={1}
                         theme={theme}
                         topInset={reserveValueZoomAxisSpace
                             ? ZOOM_AXIS_TOP_SPACE
                             : 0}
                     />
                 )}
                 {showValueAxis && (
                     <div ref={valueBrushContainerRef} style={{ width: "100%", order: 2 }}>
                         <TemporalValueBrush
                             interactive={valueBrushEnabled}
                             max={domainMax}
                             min={domainMin}
                             step={sliderStep}
                             showTicks={sliderShowTicks}
                             tickStep={sliderTickStep}
                             ticksArray={sliderTicksArray}
                             mode={chartData.mode ?? mode}
                              onInteractionStart={clearRectangleSelection}
                             onRangeChange={handleValueBrushRangeChange}
                             target={target}
                             width={valueBrushWidth}
                             widgetType={
                                 chartData.isRangeSlider
                                     ? "range-slider"
                                     : "single-slider"
                             }
                         />
                     </div>
                 )}
                 
                 
                  {chartData.isRangeSlider || chartData.isSingleSlider ? (
                       <div style={{
                           position: 'relative',
                           width: '100%',
                           height: `${temporalPlotHeight}px`,
                           minHeight: `${temporalPlotHeight}px`,
                           overflow: valueBrushRange ? 'hidden' : 'visible',
                           order: 1,
                           cursor: rectangleToolEnabled
                               ? rectangleDragMode === 'move' ? 'move' : 'crosshair'
                               : undefined,
                       }}
                       data-provenance-rectangle-plot={
                           rectangleToolEnabled ? "true" : undefined
                       }
                       onMouseDown={handleRectangleMouseDown}
                       >
                        <svg
                            height={temporalPlotHeight}
                            style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: `${temporalPlotHeight}px`, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
                        >
                            {temporalSmoothing.active ? (
                                <SliderTemporalSmoothingCurve
                                    samples={temporalSmoothing.samples}
                                    method={temporalSmoothing.method}
                                    min={valueDomainMin}
                                    max={valueDomainMax}
                                    width={Math.max(valueBrushWidth - 12, 1)}
                                    height={temporalPlotHeight}
                                    range={chartData.isRangeSlider}
                                    recencyStops={temporalSmoothingStops}
                                    gradientKey={`${target}-temporal`}
                                />
                            ) : temporalSliderConnections.map(connection => (
                                <line
                                    key={`${connection.endpoint}-${connection.fromIndex}`}
                                    data-provenance-temporal-line={connection.endpoint}
                                    x1={`${connection.x1}%`}
                                    y1={connection.y1}
                                    x2={`${connection.x2}%`}
                                    y2={connection.y2}
                                    stroke={TEMPORAL_LINE_COLOR}
                                    strokeWidth={TEMPORAL_LINE_WIDTH}
                                />
                            ))}
                         </svg>

                          <div style={{
                              position: 'relative',
                              height: `${temporalPlotHeight}px`,
                         }}>
                              {!temporalSmoothing.active && sortedEntries.map(([label, records], index) => {
                                  const totalRows = sortedEntries.length;
                                  const relativeIndex = index / (totalRows - 1 || 1);
                                  const color = d3.interpolateOranges(0.3 + (relativeIndex * 0.7));
 
                                  return (
                                  <div key={label} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      height: '16px',
                                      position: 'absolute',
                                      top: `${temporalYPositions[index] - 8}px`,
                                      left: 0,
                                      right: 0,
                                      zIndex: 1,
                                  }}>
                                      <div style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: '100%', background: 'transparent', borderRadius: '3px', zIndex: 0 }}>
                                          {records.map((record, i) => {
                                               if (!record.select) return null;
                                               const start = record.select.index;
                                               const end = record.unselect ? record.unselect.index : maxIndex;
                                               
                                               const left = ((start - valueDomainMin) / rangeSpan) * 100;
                                               const right = ((end - valueDomainMin) / rangeSpan) * 100;
                                               const lowValue = Array.isArray(record.value)
                                                   ? record.value[0]
                                                   : record.value ?? start;
                                               const highValue = Array.isArray(record.value)
                                                   ? record.value[1]
                                                   : end;
                                               const lowTooltipProps = getTooltipAnchorProps(
                                                   tooltipId,
                                                   () => formatTemporalTooltip({
                                                       label: chartData.tooltipLabel,
                                                       value: lowValue,
                                                       record: chartData.isRangeSlider
                                                           ? { ...record, value: lowValue }
                                                           : record,
                                                       kind: chartData.tooltipKind,
                                                   })
                                               );
                                               const highTooltipProps = chartData.isRangeSlider
                                                   ? getTooltipAnchorProps(
                                                       tooltipId,
                                                       () => formatTemporalTooltip({
                                                           label: chartData.tooltipLabel,
                                                           value: highValue,
                                                           record: { ...record, value: highValue },
                                                           kind: 'range',
                                                       })
                                                   )
                                                   : {};
                                               
                                               return (
                                                  <div key={i} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                                        <div
                                                            {...lowTooltipProps}
                                                            role="button"
                                                            tabIndex={0}
                                                            data-provenance-temporal-point="true"
                                                            data-provenance-kind={
                                                                record.kind ??
                                                                "interaction"
                                                            }
                                                            data-provenance-value={lowValue}
                                                            aria-label={
                                                                chartData.isRangeSlider
                                                                    ? (
                                                                        `Restore ${chartData.tooltipLabel} ` +
                                                                        `to ${lowValue}–${highValue}`
                                                                    )
                                                                    : (
                                                                        `Restore ${chartData.tooltipLabel} ` +
                                                                        `to ${lowValue}`
                                                                    )
                                                            }
                                                            onClick={() =>
                                                                restoreTemporalPoint({
                                                                    restoreWidgetValue,
                                                                    target,
                                                                    record,
                                                                    range:
                                                                        chartData.isRangeSlider,
                                                                })
                                                            }
                                                            onKeyDown={event => {
                                                                if (
                                                                    event.key === "Enter" ||
                                                                    event.key === " "
                                                                ) {
                                                                    event.preventDefault();
                                                                    restoreTemporalPoint({
                                                                        restoreWidgetValue,
                                                                        target,
                                                                        record,
                                                                        range:
                                                                            chartData.isRangeSlider,
                                                                    });
                                                                }
                                                            }}
                                                            style={{
                                                                ...lowTooltipProps.style,
                                                                position: 'absolute',
                                                                left: `calc(${left}% - 8px)`,
                                                                top: 0,
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'transparent',
                                                                zIndex: 2,
                                                                cursor: 'pointer',
                                                                opacity:
                                                                    record.kind === "sample"
                                                                        ? 0.7
                                                                        : 1,
                                                            }}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: '4px',
                                                                    top: '4px',
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: color,
                                                                    border: `1px solid ${TEMPORAL_LINE_COLOR}`,
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                       {chartData.isRangeSlider && (
                                                           <div
                                                               {...highTooltipProps}
                                                               role="button"
                                                               tabIndex={0}
                                                               data-provenance-temporal-point="true"
                                                               data-provenance-kind={
                                                                   record.kind ??
                                                                   "interaction"
                                                               }
                                                               data-provenance-value={highValue}
                                                               aria-label={
                                                                   `Restore ${chartData.tooltipLabel} ` +
                                                                   `to ${lowValue}–${highValue}`
                                                               }
                                                               onClick={() =>
                                                                   restoreTemporalPoint({
                                                                       restoreWidgetValue,
                                                                       target,
                                                                       record,
                                                                       range: true,
                                                                   })
                                                               }
                                                               onKeyDown={event => {
                                                                   if (
                                                                       event.key === "Enter" ||
                                                                       event.key === " "
                                                                   ) {
                                                                       event.preventDefault();
                                                                       restoreTemporalPoint({
                                                                           restoreWidgetValue,
                                                                           target,
                                                                           record,
                                                                           range: true,
                                                                       });
                                                                   }
                                                               }}
                                                               style={{
                                                                   ...highTooltipProps.style,
                                                                   position: 'absolute',
                                                                   left: `calc(${right}% - 8px)`,
                                                                   top: 0,
                                                                   width: '16px',
                                                                   height: '16px',
                                                                   borderRadius: '50%',
                                                                   backgroundColor: 'transparent',
                                                                   zIndex: 2,
                                                                   cursor: 'pointer',
                                                                   opacity:
                                                                       record.kind === "sample"
                                                                           ? 0.7
                                                                           : 1,
                                                               }}
                                                           >
                                                               <span
                                                                   aria-hidden="true"
                                                                   style={{
                                                                       position: 'absolute',
                                                                       left: '4px',
                                                                       top: '4px',
                                                                       width: '8px',
                                                                       height: '8px',
                                                                       borderRadius: '50%',
                                                                       backgroundColor: color,
                                                                       border: `1px solid ${TEMPORAL_LINE_COLOR}`,
                                                                       pointerEvents: 'none',
                                                                   }}
                                                               />
                                                           </div>
                                                       )}
                                                   </div>
                                               );
                                          })}
                                      </div>
                                  </div>
                              )})}
                          </div>
                          {rectangleToolEnabled && rectangleSelection && (
                              <div
                                  data-provenance-rectangle-selection="true"
                                  aria-hidden="true"
                                  style={{
                                      position: "absolute",
                                      left: `${rectangleSelection.left}px`,
                                      top: `${rectangleSelection.top}px`,
                                      width: `${rectangleSelection.width}px`,
                                      height: `${rectangleSelection.height}px`,
                                      ...rectangleZoomStyle,
                                      pointerEvents: rectangleDragMode === "create" ? "none" : "auto",
                                      cursor: "move",
                                      zIndex: 4,
                                  }}
                              />
                          )}
                      </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1 }}>
                         {sortedEntries.map(([label, records]) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                                  <div style={{ position: 'absolute', inset: 0 }}>
                                      <TimelineVis
                                          records={records}
                                          maxIndex={maxIndex}
                                          smoothing={scalability?.temporal_view?.strategy === "smoothing"}
                                          smoothingWholeBar
                                          smoothingBlurRadius={scalability?.temporal_view?.smoothing_options?.blur_radius}
                                          tooltipId={tooltipId}
                                          widgetId={chartData.tooltipLabel}
                                          value={label}
                                          kind={chartData.tooltipKind}
                                      />
                                  </div>

                                  <div style={{ position: 'relative', zIndex: 1, padding: '0 8px', width: '100%', fontSize: '12px', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }} title={label}>
                                      {label}
                                  </div>
                              </div>
                         ))}
                      </div>
                    )}
               </div>
           </div>
           {rectangleToolEnabled && rectanglePoints.length > 0 && (
               <RectangleDerivedChart
                   height={temporalPlotHeight}
                   mode={chartData.mode ?? mode}
                   placement="full"
                   points={rectanglePoints}
                   range={chartData.isRangeSlider}
                   theme={theme}
                   tooltipId={tooltipId}
                   tooltipLabel={chartData.tooltipLabel}
                   tooltipKind={chartData.tooltipKind}
                   width={valueBrushWidth}
                   domainMin={
                       rectangleValueDomain?.[0] ?? valueDomainMin
                   }
                   domainMax={
                       rectangleValueDomain?.[1] ?? valueDomainMax
                   }
               />
           )}
           </>
         );

        if (part === "header") {
            return renderHeader();
        } else if (part === "body") {
            return (
                <div
                    data-provenance-chart-target={target}
                    style={{ padding: '15px', minWidth: '100%', boxSizing: 'border-box', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}
                >
                    {renderBody()}
                </div>
            );
        }

        return (
            <div
                data-provenance-chart-target={target}
                style={{ padding: '15px', minWidth: '100%', boxSizing: 'border-box', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}
            >
                {renderBody()}
                {renderHeader()}
            </div>
        );
    }

    return (
        <div
            ref={chartRef}
            className="sequence-chart"
            data-provenance-chart-target={target}
        />
    );
};

export default Chart;
