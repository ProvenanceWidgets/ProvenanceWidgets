import { RadioButton as Radiobutton_ } from 'primereact/radiobutton/radiobutton.esm.js';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRadioGroup } from './RadioGroup.js';
import Bars from 'scents';
import { interpolateOranges } from 'd3';
import { getBarLabelColor } from './utils.js';
import useElementSize from './hooks/useElementSize.js';
import useRevertedValue from './hooks/useRevertedValue.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import TimelineVis from './TimelineVis.js';
import {
    formatAggregateTooltip,
    getTemporalRowTooltipProps,
    getAggregateTooltipRecord,
    getTooltipAnchorProps,
} from './provenanceTooltip.js';

const Radiobutton = ({ label, value, stateItem, setStateItem }) => {
    const [check, setCheck] = useState()
    const radioGroup = useRadioGroup();
    const [revertedValue] = useRevertedValue(radioGroup?.id);
    const [containerRef, { width: containerWidth }] = useElementSize();
    const tooltipId = useProvenanceTooltip();
    const [showTimeline, setShowTimeline] = useState(false);
    const [axisOffsetPx, setAxisOffsetPx] = useState(0);
    const containerElRef = useRef(null);
    const timelineVersion = radioGroup?.guidance?.domain?.get?.("index")?.[1] ?? 0;
    const setCombinedRef = (node) => {
        containerElRef.current = node;
        containerRef(node);
    };

    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === radioGroup?.id) {
                setShowTimeline(e.detail.open);
            }
        };
        window.addEventListener('provenance-timeline-toggle', handleToggle);
        return () => window.removeEventListener('provenance-timeline-toggle', handleToggle);
    }, [radioGroup?.id]);

    useEffect(() => {
        if (!showTimeline || !radioGroup?.id) return;

        const compute = () => {
            const axisEl = document.querySelector(`[data-timeline-axis="${radioGroup.id}"]`);
            const rowEl = containerElRef.current;
            if (!axisEl || !rowEl) return;

            const axisLeft = axisEl.getBoundingClientRect().left;
            const rowLeft = rowEl.getBoundingClientRect().left;
            const nextOffset = Math.max(0, Math.round(axisLeft - rowLeft));
            setAxisOffsetPx(nextOffset);
        };

        const raf = requestAnimationFrame(compute);
        window.addEventListener('resize', compute);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', compute);
        };
    }, [showTimeline, radioGroup?.id]);

    // Register this radio button with the group when it mounts
    useEffect(() => {
        if (radioGroup && radioGroup.registerRadio) {
            radioGroup.registerRadio(value);
        }
    }, [value, radioGroup]);

    const timelineData = useMemo(() => {
        if (!showTimeline || !radioGroup?.guidance?.detailedData) return null;
        
        const detailedData = radioGroup.guidance.detailedData;
        // detailedData is Map<value, records>
        const records = detailedData.get(value);
        if (!records) return null;

        // Calculate max index for the entire group
        let maxIndex = 0;
        const allRecords = Array.from(detailedData.values()).flat();
        for (const record of allRecords) {
            if (record.select?.index > maxIndex) maxIndex = record.select.index;
            if (record.unselect?.index > maxIndex) maxIndex = record.unselect.index;
        }
        
        // Also check domain if available
        const domainMax = radioGroup.guidance.domain?.get ? radioGroup.guidance.domain.get("index")?.[1] : 0;
        const displayMax = Math.max(maxIndex, domainMax || 0, 1) + 1;

        return { records, maxIndex: displayMax };
    }, [showTimeline, radioGroup?.guidance, value, timelineVersion]);

    useEffect(() => {
        if (revertedValue !== undefined) {
            // Don't call setStateItem here - the parent (index.js) will handle it
            // This prevents duplicate provenance logging
            // The RadioGroup already logged the reversion in its useEffect
        }
    }, [revertedValue, value, setStateItem]);

    const handleChange = (e) => {
        const newValue = e.value;
        setStateItem(newValue);
        // Update the radio state in the group with the selected value
        if (radioGroup && radioGroup.updateRadioState) {
            radioGroup.updateRadioState(newValue);
        }
    }

    const rowTooltipProps = !showTimeline
        ? getTooltipAnchorProps(
            tooltipId,
            formatAggregateTooltip({
                label: radioGroup?.tooltipLabel ?? radioGroup?.id,
                value,
                record: getAggregateTooltipRecord(
                    radioGroup?.guidance,
                    value,
                    'single-selection'
                ),
                kind: 'single-selection',
            }),
            { focusable: false }
        )
        : timelineData
            ? getTemporalRowTooltipProps(tooltipId, {
                records: timelineData.records,
                maxIndex: timelineData.maxIndex,
                getBounds: () => {
                    const rect = containerElRef.current?.getBoundingClientRect();
                    return rect
                        ? { left: rect.left + axisOffsetPx, right: rect.right }
                        : null;
                },
                label: radioGroup?.tooltipLabel ?? radioGroup?.id,
                value,
                kind: 'single-selection',
            })
            : {};

    return (
        <div
            {...rowTooltipProps}
            style={{
                ...rowTooltipProps.style,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "1rem",
                width: "100%",
            }}
        >
            <Radiobutton_ inputId={value} name={label} value={value} onChange={handleChange} checked={stateItem === value} />
            <div ref={setCombinedRef} style={{ position: "relative", flex: 1, display: 'flex', alignItems: 'center' }}>
                {!showTimeline && containerWidth > 0 && radioGroup?.guidance &&
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                        <Bars
                            guidance={radioGroup.guidance}
                            orientationScheme={interpolateOranges}
                            barKeys={[value]}
                            encodings={{
                                orientation: "horizontal",
                                positionDomain: "interactions",
                                colorDomain: "index",
                            }}
                            width={containerWidth}
                            height={24}
                            layout="checkbox"
                        />
                    </div>
                }
                
                {/* Render Timeline In-Situ (Background Layer) */}
                {showTimeline && timelineData && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                        <TimelineVis
                            records={timelineData.records}
                            maxIndex={timelineData.maxIndex}
                            leftInsetPx={axisOffsetPx}
                            tooltipId={tooltipId}
                            widgetId={radioGroup?.tooltipLabel ?? radioGroup?.id}
                            value={value}
                            kind="single-selection"
                        />
                    </div>
                )}

                <label htmlFor={value} className="ml-2" style={{
                    position: "relative",
                    zIndex: 1, // Ensure text is on top
                    display: "block",
                    padding: "2px 8px",
                    color: showTimeline
                        ? '#000000'
                        : getBarLabelColor(value, radioGroup?.guidance, interpolateOranges),
                    minWidth: '60px' // Ensure label has some width
                }}>{value}</label>
            </div>
        </div>
    )
}

export default Radiobutton
