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
    buildInputTextTemporalEntries,
    restoreInputTextTemporalValue,
} from '../shared/logic/inputTextValue.js';

const TEMPORAL_BRUSH_HEIGHT = 240;
// Keep the plot height stable as the interaction history grows.
const TEMPORAL_SLIDER_HEIGHT = 250;
// Text history uses a taller fixed plot without an inner scrollbar.
const INPUT_TEXT_TEMPORAL_HEIGHT = 440;

const TemporalBrush = ({
    mode,
    onRangeChange,
    positions,
    target,
    tooltipId,
    widgetType,
}) => {
    const brushRef = useRef(null);
    const entryCount = positions.length;

    useEffect(() => {
        if (!brushRef.current || entryCount <= 1) return undefined;

        const brush = d3
            .brushY()
            // Attach the brush to the y-axis and extend its hit area left.
            .extent([[-42, 0], [0, TEMPORAL_BRUSH_HEIGHT]])
            .on("end", event => {
                const range = brushSelectionToPositionRange(
                    event.selection,
                    positions
                );
                onRangeChange(range);
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

        const brushGroup = d3.select(brushRef.current).call(brush);
        brushGroup
            .selectAll(".overlay")
            .attr("fill", "rgba(113, 231, 251, 0.06)")
            .style("cursor", "ns-resize");
        brushGroup
            .selectAll(".selection")
            .attr("fill", "#71e7fb")
            .attr("fill-opacity", 0.24)
            .attr("stroke", "#17a2b8")
            .attr("stroke-width", 1.5);
        brushGroup
            .selectAll(".handle")
            .attr("fill", "#17a2b8")
            .attr("fill-opacity", 0.8);
        return () => {
            d3.select(brushRef.current).on(".brush", null);
        };
    }, [
        entryCount,
        mode,
        onRangeChange,
        positions,
        target,
        widgetType,
    ]);

    if (entryCount <= 1) return null;
    const tickStride = Math.max(1, Math.ceil(entryCount / 8));
    const ticks = positions
        .map((position, index) => ({ position, index }))
        .filter(({ index }) => (
            mode === "time"
                ? index === 0 || index === entryCount - 1
                : (
                    index % tickStride === 0 ||
                    index === entryCount - 1
                )
        ));
    const tooltipProps = getTooltipAnchorProps(
        tooltipId,
        "Drag vertically to zoom the history range. " +
        "Click outside the selection to show all history."
    );

    return (
        <div
            {...tooltipProps}
            style={{
                ...tooltipProps.style,
                flex: "0 0 64px",
                width: "64px",
            }}
        >
            <svg
                aria-label={
                    `Drag vertically to zoom ${widgetType} history`
                }
                data-provenance-temporal-brush={target}
                width="64"
                height={TEMPORAL_BRUSH_HEIGHT}
                style={{ display: "block", overflow: "visible" }}
            >
                <title>
                    Drag vertically to zoom; clear the selection to reset
                </title>
                <text
                    x="10"
                    y={TEMPORAL_BRUSH_HEIGHT / 2}
                    fill="#6c757d"
                    fontSize="11"
                    textAnchor="middle"
                    transform={
                        `rotate(-90 10 ${TEMPORAL_BRUSH_HEIGHT / 2})`
                    }
                >
                    {mode === "time"
                        ? "time · drag to zoom"
                        : "interaction · drag to zoom"}
                </text>
                <line
                    x1="58"
                    x2="58"
                    y1="0"
                    y2={TEMPORAL_BRUSH_HEIGHT}
                    stroke="#6c757d"
                />
                {ticks.map(({ position, index }) => (
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
                            {mode === "time"
                                ? index === 0 ? "t=0" : "now"
                                : index}
                        </text>
                    </g>
                ))}
                <g ref={brushRef} transform="translate(58,0)" />
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
}) => {
    const chartRef = useRef(null);
    const [registeredComponents] = useProvenance();
    const { restoreWidgetValue } = useWidgetRegistry();
    const tooltipId = useProvenanceTooltip();
    const [brushRange, setBrushRange] = useState(null);
    const handleBrushRangeChange = useCallback(
        range => setBrushRange(range),
        []
    );

    useEffect(() => {
        setBrushRange(null);
    }, [target, temporalBrush]);
    
    const chartData = useMemo(() => {
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
            const sequenceTotal = sorted.filter(([, record]) =>
                record.kind === undefined ||
                record.kind === "interaction"
            ).length - sequenceOffset;
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
                    sequenceIndex: Math.max(
                        0,
                        interactionIndex - sequenceOffset
                    ),
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

    if (!chartData) return null;

    if (chartData.isCheckboxGroup) {
        const { detailedDataEntries, indexDomain } = chartData;
        
        const allSortedEntries = chartData.isRangeSlider || chartData.isSingleSlider
            ? [...detailedDataEntries]
            : [...detailedDataEntries].sort((a, b) => a[0].localeCompare(b[0]));
        const brushEnabled =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush) &&
            allSortedEntries.length > 1;
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
            TEMPORAL_BRUSH_HEIGHT
        );
        const inputTextEntries = chartData.inputTextEntries ?? [];
        const inputTextPlotHeight = INPUT_TEXT_TEMPORAL_HEIGHT;
        const inputTextYPositions = getTemporalYPositions(
            inputTextEntries,
            "interaction",
            inputTextPlotHeight
        );
        const inputTextSequenceMax = Math.max(
            0,
            inputTextEntries.length - 1
        );
        const inputTextTicks = inputTextSequenceMax === 0
            ? [0]
            : d3.ticks(0, inputTextSequenceMax, 10);
        const inputTextTickFormat = inputTextSequenceMax === 0
            ? () => "0"
            : d3.tickFormat(0, inputTextSequenceMax, 10);
        const getInputTextTickY = value => {
            if (inputTextSequenceMax === 0) {
                return inputTextPlotHeight / 2;
            }
            return 8 + (
                (value / inputTextSequenceMax) *
                (inputTextPlotHeight - 16)
            );
        };
        
        let calculatedMax = 0;
        for (const [, records] of sortedEntries) {
            for (const record of records) {
                if (record.select?.index > calculatedMax) calculatedMax = record.select.index;
                if (record.unselect?.index > calculatedMax) calculatedMax = record.unselect.index;
            }
        }
        
        const domainMax = indexDomain ? indexDomain[1] : 0;
        const domainMin = indexDomain ? indexDomain[0] : 0;
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
        const rangeSpan = maxIndex - minIndex;
        const temporalSliderConnections = buildTemporalSliderConnections({
            entries: sortedEntries,
            yPositions: temporalYPositions,
            domainMin: minIndex,
            domainMax: maxIndex,
            range: chartData.isRangeSlider,
        });
        const indexOffset = usesContinuousDomain ? 0 : 1;
        const displayMaxIndex = Math.max(maxIndex - indexOffset, 1);
        const displaySpan = displayMaxIndex - minIndex;

        const isLight = theme === "light";
        const bgColor = isLight ? "#fff" : "#333";
        const textColor = isLight ? "#000" : "#eee"; // Or white
        const axisColor = isLight ? "#ccc" : "#555";
        const labelColor = isLight ? "#333" : "#ccc"; // For n=0, now labels
        const rowBg = isLight ? "#f5f5f5" : "#444"; // Background for timeline track

        const renderHeader = () => {
            if (chartData.isInputText) return null;
            const hasLeftAxisLabel = chartData.isRangeSlider || chartData.isSingleSlider;
            const brushWidth = brushEnabled ? 64 : 0;
            const leftLabelWidth = hasLeftAxisLabel
                ? brushEnabled ? brushWidth : 28
                : 0;
            // TemporalBrush already occupies the complete body gutter. The
            // compact vertical label is the only variant with an 8px gap.
            const leftLabelGap = hasLeftAxisLabel && !brushEnabled ? 8 : 0;
            const plotInset = hasLeftAxisLabel ? 6 : 0;
            const totalLeftGutter = leftLabelWidth + leftLabelGap + plotInset;
            const totalRightInset = plotInset;
            const innerWidthCalc = `calc(100% - ${totalLeftGutter + totalRightInset}px)`;
            const innerMarginLeft = `${totalLeftGutter}px`;
            
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
                                   ? minIndex
                                   : "n=0"}
                        </span>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold', transform: hasLeftAxisLabel ? 'translateX(50%)' : undefined }}>
                           {chartData.isRangeSlider ||
                           chartData.isSingleSlider
                               ? maxIndex
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
                <div
                    style={{
                        position: "relative",
                        flex: "0 0 48px",
                        height: `${inputTextPlotHeight}px`,
                        color: "#6c757d",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: "8px auto 8px 0",
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            fontSize: "11px",
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        Sequence of Interaction (0 = first)
                    </div>
                    <svg
                        aria-hidden="true"
                        width="60"
                        height={inputTextPlotHeight}
                        style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            overflow: "visible",
                            pointerEvents: "none",
                        }}
                    >
                        <line
                            x1="60"
                            x2="60"
                            y1="8"
                            y2={inputTextPlotHeight - 8}
                            stroke="#495057"
                            strokeWidth="1"
                        />
                        {inputTextTicks.map(value => (
                            <g
                                key={value}
                                transform={
                                    `translate(0 ${getInputTextTickY(value)})`
                                }
                            >
                                <line
                                    x1="52"
                                    x2="60"
                                    y1="0"
                                    y2="0"
                                    stroke="#495057"
                                    strokeWidth="1"
                                />
                                <text
                                    x="48"
                                    y="0"
                                    dy="0.32em"
                                    fill="#495057"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {inputTextTickFormat(value)}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
                <div
                    style={{
                        position: "relative",
                        flex: 1,
                        minWidth: 0,
                        height: `${inputTextPlotHeight}px`,
                    }}
                >
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
                                        `${inputTextYPositions[index] - 8}px`,
                                    left: 0,
                                    right: 0,
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
             <div
                 data-provenance-chart-target={target}
                 style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}
             >
                 {brushEnabled && (
                     <TemporalBrush
                         mode={chartData.mode ?? mode}
                         onRangeChange={handleBrushRangeChange}
                         positions={brushYPositions}
                         target={target}
                         tooltipId={tooltipId}
                         widgetType={
                             chartData.isRangeSlider
                                 ? "range-slider"
                                 : "single-slider"
                         }
                     />
                 )}
                 {(
                     (chartData.isRangeSlider ||
                         chartData.isSingleSlider) &&
                     !brushEnabled
                 ) && (
                     <div style={{ 
                         writingMode: 'vertical-rl', 
                         transform: 'rotate(180deg)',
                         fontSize: '12px', 
                         color: '#999', 
                         fontWeight: 'bold', 
                         textAlign: 'center', 
                         marginRight: '8px',
                         width: '28px',
                         minWidth: '28px',
                         whiteSpace: 'nowrap',
                         alignSelf: 'center'
                     }}>
                         {(chartData.mode ?? mode) === "time"
                             ? "time"
                             : "Sequence of Interactions"}
                     </div>
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
                 }}>
                 
                 
                 {chartData.isRangeSlider || chartData.isSingleSlider ? (
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: `${temporalPlotHeight}px`,
                        minHeight: `${temporalPlotHeight}px`,
                    }}>
                        <svg
                            height={temporalPlotHeight}
                            style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: `${temporalPlotHeight}px`, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
                        >
                            {temporalSliderConnections.map(connection => (
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
                              {sortedEntries.map(([label, records], index) => {
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
                                               
                                               const left = ((start - minIndex) / rangeSpan) * 100;
                                               const right = ((end - minIndex) / rangeSpan) * 100;
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
                     </div>
                  ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1 }}>
                         {sortedEntries.map(([label, records]) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: rowBg, borderRadius: '3px', zIndex: 0 }}>
                                      {records.map((record, i) => {
                                           if (!record.select) return null;
                                           const startRaw = record.select.index;
                                           const endRaw = record.unselect ? record.unselect.index : maxIndex;
                                           const start = (startRaw ?? 0) - indexOffset;
                                           const end = (endRaw ?? maxIndex) - indexOffset;
                                           
                                           const left = ((start - minIndex) / (displaySpan || 1)) * 100;
                                           const width = Math.max(0, ((end - start) / (displaySpan || 1)) * 100);
                                           
                                           const relativeTime = (start - minIndex) / (displaySpan || 1);
                                           const color = d3.interpolateOranges(0.3 + (relativeTime * 0.7));
                                           const tooltipProps = getTooltipAnchorProps(
                                               tooltipId,
                                               () => formatTemporalTooltip({
                                                   label: chartData.tooltipLabel,
                                                   value: label,
                                                   record,
                                                   kind: chartData.tooltipKind,
                                               })
                                           );
                                           
                                            return (
                                               <div
                                                  key={i}
                                                  {...tooltipProps}
                                                  role={
                                                      chartData.isInputText
                                                          ? "button"
                                                          : undefined
                                                  }
                                                  tabIndex={
                                                      chartData.isInputText
                                                          ? 0
                                                          : undefined
                                                  }
                                                  data-provenance-temporal-value={
                                                      chartData.isInputText
                                                          ? record.value
                                                          : undefined
                                                  }
                                                  aria-label={
                                                      chartData.isInputText
                                                          ? (
                                                              `Restore ${chartData.tooltipLabel} ` +
                                                              `to ${record.value === ""
                                                                  ? "<empty>"
                                                                  : record.value}`
                                                          )
                                                          : undefined
                                                  }
                                                  onClick={
                                                      chartData.isInputText
                                                          ? () =>
                                                              restoreInputTextTemporalValue({
                                                                  restoreWidgetValue,
                                                                  target,
                                                                  value:
                                                                      record.value,
                                                              })
                                                          : undefined
                                                  }
                                                  onKeyDown={
                                                      chartData.isInputText
                                                          ? event => {
                                                              if (
                                                                  event.key === "Enter" ||
                                                                  event.key === " "
                                                              ) {
                                                                  event.preventDefault();
                                                                  restoreInputTextTemporalValue({
                                                                      restoreWidgetValue,
                                                                      target,
                                                                      value:
                                                                          record.value,
                                                                  });
                                                              }
                                                          }
                                                          : undefined
                                                  }
                                                  style={{
                                                    ...tooltipProps.style,
                                                    position: 'absolute',
                                                   left: `${left}%`,
                                                   width: `${width}%`,
                                                   minWidth: '8px',
                                                    height: '100%',
                                                    backgroundColor: color,
                                                    border: `1px solid ${d3.color(color).darker()}`,
                                                    cursor:
                                                        chartData.isInputText
                                                            ? 'pointer'
                                                            : 'default',
                                                    opacity:
                                                        record.kind === "sample"
                                                            ? 0.7
                                                            : 1,
                                                }} />
                                           );
                                      })}
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
