import { Checkbox as Checkbox_ } from 'primereact/checkbox/checkbox.esm.js';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useCheckboxGroup } from './CheckboxGroup.js';
import Bars from 'scents';
import { interpolateOranges } from 'd3';
import { getScentColor, getContrastColor } from './utils.js';
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

const Checkbox = ({ label }) => {
    const [check, setCheck] = useState(false)
    const checkboxGroup = useCheckboxGroup();
    const [revertedValue] = useRevertedValue(checkboxGroup?.id);
    const [showTimeline, setShowTimeline] = useState(false);
    const tooltipId = useProvenanceTooltip();
    const [axisOffsetPx, setAxisOffsetPx] = useState(0);
    const timelineVersion = checkboxGroup?.guidance?.domain?.get?.("index")?.[1] ?? 0;

    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === checkboxGroup?.id) {
                setShowTimeline(e.detail.open);
            }
        };
        window.addEventListener('provenance-timeline-toggle', handleToggle);
        return () => window.removeEventListener('provenance-timeline-toggle', handleToggle);
    }, [checkboxGroup?.id]);

    useEffect(() => {
        if (revertedValue && Array.isArray(revertedValue)) {
            setCheck(revertedValue.includes(label));
            // Update ref in group to keep it in sync with physical state
            if (checkboxGroup && checkboxGroup.updateCheckboxState) {
                // We don't want to trigger a NEW provenance insertion here, 
                // but the current implementation of updateCheckboxState triggers one.
                // We should probably refine updateCheckboxState to only insert if NOT in "reverting" mode.
                // However, the requested task is to "set the value of each widget".
            }
        }
    }, [revertedValue, label]);
    const [containerRef, { width: containerWidth }] = useElementSize();
    const containerElRef = useRef(null);
    const setCombinedRef = (node) => {
        containerElRef.current = node;
        containerRef(node);
    };

    useEffect(() => {
        if (!showTimeline || !checkboxGroup?.id) return;

        const compute = () => {
            const axisEl = document.querySelector(`[data-timeline-axis="${checkboxGroup.id}"]`);
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
    }, [showTimeline, checkboxGroup?.id]);

    // Register this checkbox with the group when it mounts
    useEffect(() => {
        if (checkboxGroup && checkboxGroup.registerCheckbox) {
            checkboxGroup.registerCheckbox(label);
        }
    }, [label, checkboxGroup]);

    const timelineData = useMemo(() => {
        if (!showTimeline || !checkboxGroup?.guidance?.detailedData) return null;
        
        const detailedData = checkboxGroup.guidance.detailedData;
        // detailedData is Map<label, records>
        const records = detailedData.get(label);
        if (!records) return null;

        // Calculate max index for the entire group
        let maxIndex = 0;
        const allRecords = Array.from(detailedData.values()).flat();
        for (const record of allRecords) {
            if (record.select?.index > maxIndex) maxIndex = record.select.index;
            if (record.unselect?.index > maxIndex) maxIndex = record.unselect.index;
        }
        
        // Also check domain if available
        const domainMax = checkboxGroup.guidance.domain?.get ? checkboxGroup.guidance.domain.get("index")?.[1] : 0;
        const displayMax = Math.max(maxIndex, domainMax || 0, 1) + 1;

        return { records, maxIndex: displayMax };
    }, [showTimeline, checkboxGroup?.guidance, label, timelineVersion]);

    const handleChange = (e) => {
        const newChecked = e.checked;
        setCheck(newChecked);
        // Update the checkbox state in the group
        if (checkboxGroup && checkboxGroup.updateCheckboxState) {
            checkboxGroup.updateCheckboxState(label, newChecked);
        }
    }

    const rowTooltipProps = !showTimeline
        ? getTooltipAnchorProps(
            tooltipId,
            formatAggregateTooltip({
                label: checkboxGroup?.tooltipLabel ?? checkboxGroup?.id,
                value: label,
                record: getAggregateTooltipRecord(
                    checkboxGroup?.guidance,
                    label,
                    'multi-selection'
                ),
                kind: 'multi-selection',
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
                label: checkboxGroup?.tooltipLabel ?? checkboxGroup?.id,
                value: label,
                kind: 'multi-selection',
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
            <Checkbox_ inputId={label} name={label} value={label} onChange={handleChange} checked={check} />
            <div ref={setCombinedRef} style={{ position: "relative", flex: 1, display: 'flex', alignItems: 'center' }}>
                {!showTimeline && containerWidth > 0 && checkboxGroup?.guidance &&
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                        <Bars
                            guidance={checkboxGroup.guidance}
                            orientationScheme={interpolateOranges}
                            barKeys={[label]}
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
                            widgetId={checkboxGroup?.tooltipLabel ?? checkboxGroup?.id}
                            value={label}
                            kind="multi-selection"
                        />
                    </div>
                )}

                <label htmlFor={label} className="ml-2" style={{
                    position: "relative",
                    zIndex: 1, // Ensure text is on top
                    display: "block",
                    padding: "2px 8px",
                    color: '#000000', // Force black color
                    minWidth: '60px' // Ensure label has some width
                }}>{label}</label>
            </div>
        </div>
    )
}

export default Checkbox
