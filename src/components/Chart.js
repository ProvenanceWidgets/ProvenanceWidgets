import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import useProvenance from './hooks/useProvenance.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import { interpolateOranges } from 'd3'; // Import color scale
import { formatTemporalTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';

const Chart = ({ target, part = "full", theme = "dark" }) => {
    // part: "full" | "header" | "body"
    // theme: "dark" | "light"
    const chartRef = useRef(null);
    const [registeredComponents] = useProvenance();
    const tooltipId = useProvenanceTooltip();
    
    const chartData = useMemo(() => {
        if (!target) return null;

        // Get the component data based on target (Map first, fallback to plain object)
        const componentData = registeredComponents instanceof Map
            ? registeredComponents.get(target)
            : registeredComponents?.[target];
        if (!componentData) return null;

        const domain = componentData.domain instanceof Map
            ? componentData.domain
            : componentData.domain
                ? new Map(Object.entries(componentData.domain))
                : null;
        
        // Get index domain
        const indexDomain = domain?.get
            ? domain.get("index")
            : domain?.index;

        // Normalize detailedData entries for flexible data sources
        const detailedDataEntries = componentData.detailedData instanceof Map
            ? Array.from(componentData.detailedData.entries())
            : componentData.detailedData && typeof componentData.detailedData.entries === 'function'
                ? Array.from(componentData.detailedData.entries())
                : Array.isArray(componentData.detailedData)
                    ? componentData.detailedData.map((v, i) => [i, v])
                    : [];

        let isCheckboxGroup = false;

        // Check if this is a checkbox group (SelectionProvenance)
        // Checkbox groups have detailedData with string keys and TemporalSelectionRecord arrays
        if (detailedDataEntries.length > 0) {
            const firstEntry = detailedDataEntries[0];
            const firstKey = firstEntry[0];
            const firstValue = firstEntry[1];
            // Check if keys are strings and values are arrays with select/unselect properties
            if (typeof firstKey === 'string' && 
                Array.isArray(firstValue) && 
                firstValue.length > 0 && 
                firstValue[0]?.select) {
                isCheckboxGroup = true;
            }
        }
        
        // Check if this is a Single Select Dropdown (also SelectionProvenance)
        // ... (previous comments) ...
        
        // Check if this is RangedProvenance (Range Slider)
        // detailedData is typically Map<index, {value: [min, max], time, index}>
        let isRangedProvenance = false;
        if (detailedDataEntries.length > 0) {
            const val = detailedDataEntries[0][1];
            if (val && typeof val === 'object' && 'value' in val && Array.isArray(val.value) && val.value.length === 2 && typeof val.value[0] === 'number') {
                isRangedProvenance = true;
            }
        }
        
        // Check if this is TextProvenance (Input Text)
        // TextProvenance extends SuperProvenance? No, it extends GenericProvenance usually, or SuperProvenance based on search results.
        // Wait, TextProvenance.js in example shows `class TextProvenance extends SuperProvenance`.
        // But `src/strategies/provenance/TextProvenance.ts` usually extends GenericProvenance<string>.
        // Let's check detailedData structure.
        // For TextProvenance, detailedData is typically Map<index, {value, time, index}> like NumericProvenance?
        // OR does it track history of strings?
        // If it's `TextProvenance.js` from example:
        // `this.provenance.set(value, { interactions: 0, timestamps: [] })`
        // It seems to be using `this.provenance` which is not standard `detailedData`.
        // But `Input.js` uses `new TextProvenance()` from `../dist/index.js`.
        // Let's assume it follows standard Provenance structure.
        // If it extends GenericProvenance<string>, detailedData is Map<number, TemporalValueRecord<string>>.
        // But we want a GANTT view "similar to single select and multi select, with all the stored input text items rendering on a separate row."
        // This implies we want to see EACH UNIQUE TEXT VALUE as a row, and timeline bars when it was "active".
        // Input text is usually a sequence of values.
        // Value "A" at t1. Value "B" at t2. Value "A" at t3.
        // We want:
        // Row "A": [t1, t2] ... [t3, now]
        // Row "B": [t2, t3]
        
        // We need to transform the linear history (index-based) into a per-value history (like SelectionProvenance).
        let isTextProvenance = false;
        let isNumericProvenance = false;
        
        // Check if detailedData values are objects with 'value' property that is string
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
            // For Range Slider, we want y-axis as sequence of interactions and x-axis as range.
            // detailedDataEntries: [[1, {value: [0, 20], time: ..., index: 1}], [2, {value: [10, 30], ...}]]
            // We can reuse the same rendering logic if we format it as:
            // label = "Interaction 1" (or timestamp?) -> records: [{select: {index: min}, unselect: {index: max}}]
            // Wait, for range slider, the x-axis is VALUE (0 to 100), not time/index.
            // The user said: "y axis being sequence of interactions and x-axis being the range."
            // Sequence of interactions implies time/order goes DOWN the y-axis.
            // X-axis is the range value (min to max).
            
            // So we need to map each historical record to a "row".
            // Row 1: Interaction 1 ([0, 20])
            // Row 2: Interaction 2 ([10, 30])
            
            // This is slightly different from the Gantt view where x-axis is time.
            // Here x-axis is VALUE domain.
            
            // We can mock this by creating a structure where:
            // key = "Interaction K"
            // records = [{ select: { index: value[0] }, unselect: { index: value[1] } }]
            // And we need to tell the renderer to use the VALUE domain (e.g. 0-100) instead of index domain.
            
            // Sort by index (time)
            const sorted = detailedDataEntries.sort((a, b) => a[0] - b[0]);
            
            const sequenceOffset = componentData.tooltipIndexOffset ?? 0;
            const sequenceTotal = Math.max(0, sorted.length - sequenceOffset);
            const transformedData = sorted.map(([key, record]) => {
                const label = `Interaction ${record.index}`; // Or formatted time
                const min = record.value[0];
                const max = record.value[1];
                return [label, [{
                    select: { index: min, time: record.time },
                    unselect: { index: max },
                    value: record.value,
                    time: record.time,
                    sequenceIndex: Math.max(0, record.index - sequenceOffset),
                    sequenceTotal,
                }]];
            });
            
            // We need to pass the min/max of the slider as the domain.
            // RangedProvenance has minValue and maxValue properties, but they might not be in the serialized `componentData` if it's just state.
            // However, `registeredComponents` usually holds the class instance which has `minValue`/`maxValue`.
            
            let min = 0;
            let max = 100;
            if (componentData.minValue !== undefined) min = componentData.minValue;
            if (componentData.maxValue !== undefined) max = componentData.maxValue;
            
            return {
                componentData,
                // Oldest on top so the trajectory grows downward as interactions happen
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isRangeSlider: true, // Flag to customize rendering if needed (e.g. axis labels)
                tooltipKind: 'range',
                tooltipLabel: componentData.tooltipLabel ?? target,
            };
        }

        if (isTextProvenance) {
            // Transform linear history to grouped history
            const sorted = detailedDataEntries.sort((a, b) => a[0] - b[0]);
            const grouped = new Map();
            
            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const sequenceTotal = Math.max(0, sorted.length - sequenceOffset);

            if (sorted.length > 0) {
                let currentVal = sorted[0][1].value;
                let startIndex = sorted[0][1].index;
                
                // Add first start
                if (!grouped.has(currentVal)) grouped.set(currentVal, []);
                grouped.get(currentVal).push({
                    select: { index: startIndex, time: sorted[0][1].time },
                    value: currentVal,
                    sequenceIndex: Math.max(0, startIndex - sequenceOffset),
                    sequenceTotal,
                });
                
                for (let i = 1; i < sorted.length; i++) {
                    const nextRec = sorted[i][1];
                    const nextVal = nextRec.value;
                    const nextIndex = nextRec.index;

                    // Every search is a separate PW interaction, even when the
                    // same value is searched twice in succession.
                    const currentRecords = grouped.get(currentVal);
                    if (currentRecords && currentRecords.length > 0) {
                        currentRecords[currentRecords.length - 1].unselect = {
                            index: nextIndex,
                            time: nextRec.time,
                        };
                    }

                    if (!grouped.has(nextVal)) grouped.set(nextVal, []);
                    grouped.get(nextVal).push({
                        select: { index: nextIndex, time: nextRec.time },
                        value: nextVal,
                        sequenceIndex: Math.max(0, nextIndex - sequenceOffset),
                        sequenceTotal,
                    });

                    currentVal = nextVal;
                    startIndex = nextIndex;
                }
            }

            // Ensure we have a valid indexDomain that covers the latest interaction
            // If the latest interaction is open-ended (no unselect), we need the domain max to be > start index
            
            // Get the max index from the data
            let dataMaxIndex = 0;
            if (sorted.length > 0) {
                // The last record's index is the start of the latest state
                dataMaxIndex = sorted[sorted.length - 1][1].index;
            }
            
            const currentDomainMax = indexDomain ? indexDomain[1] : 0;
            const effectiveMax = Math.max(currentDomainMax, dataMaxIndex);

            return {
                componentData,
                detailedDataEntries: Array.from(grouped.entries()),
                indexDomain: [0, effectiveMax], // Force extend domain
                isCheckboxGroup: true,
                tooltipKind: 'input',
                tooltipLabel: componentData.tooltipLabel ?? target,
            };
        }

        if (isNumericProvenance) {
            // Single slider: y-axis is sequence of interactions, x-axis is slider value domain.
            // Render one point per interaction (no range).
            const sorted = detailedDataEntries.sort((a, b) => a[0] - b[0]);

            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const sequenceTotal = Math.max(0, sorted.length - sequenceOffset);
            const transformedData = sorted.map(([, record]) => {
                const key = String(record.index);
                const v = record.value;
                return [key, [{
                    select: { index: v, time: record.time },
                    value: v,
                    time: record.time,
                    sequenceIndex: Math.max(0, record.index - sequenceOffset),
                    sequenceTotal,
                }]];
            });

            const min = componentData.minValue ?? 0;
            const max = componentData.maxValue ?? 100;

            return {
                componentData,
                // Oldest on top so the trajectory grows downward as interactions happen
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isSingleSlider: true,
                tooltipKind: 'slider',
                tooltipLabel: componentData.tooltipLabel ?? target,
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
    }, [target, registeredComponents]);

    // ... useEffect for D3 ...

    if (!chartData) return null;

    if (chartData.isCheckboxGroup) {
        const { detailedDataEntries, indexDomain } = chartData;
        
        const sortedEntries = chartData.isRangeSlider || chartData.isSingleSlider
            ? [...detailedDataEntries]
            : [...detailedDataEntries].sort((a, b) => a[0].localeCompare(b[0]));
        
        // Calculate max index from data if domain is missing or to ensure bounds
        let calculatedMax = 0;
        for (const [, records] of sortedEntries) {
            for (const record of records) {
                if (record.select?.index > calculatedMax) calculatedMax = record.select.index;
                if (record.unselect?.index > calculatedMax) calculatedMax = record.unselect.index;
            }
        }
        
        const domainMax = indexDomain ? indexDomain[1] : 0;
        const domainMin = indexDomain ? indexDomain[0] : 0;
        // For range slider, we use domain max. For others, ensure "now" is beyond the last event so open intervals have visible width.
        const baseMaxIndex = (chartData.isRangeSlider || chartData.isSingleSlider)
            ? domainMax
            : Math.max(domainMax, calculatedMax, 1);
        const maxIndex = (chartData.isRangeSlider || chartData.isSingleSlider) ? baseMaxIndex : baseMaxIndex + 1;
        const minIndex = (chartData.isRangeSlider || chartData.isSingleSlider) ? domainMin : 0;
        const rangeSpan = maxIndex - minIndex;
        const indexOffset = (chartData.isRangeSlider || chartData.isSingleSlider) ? 0 : 1;
        const displayMaxIndex = Math.max(maxIndex - indexOffset, 1);
        const displaySpan = displayMaxIndex - minIndex;

        const isLight = theme === "light";
        const bgColor = isLight ? "#fff" : "#333";
        const textColor = isLight ? "#000" : "#eee"; // Or white
        const axisColor = isLight ? "#ccc" : "#555";
        const labelColor = isLight ? "#333" : "#ccc"; // For n=0, now labels
        const rowBg = isLight ? "#f5f5f5" : "#444"; // Background for timeline track

        const renderHeader = () => {
            const hasLeftAxisLabel = chartData.isRangeSlider || chartData.isSingleSlider;
            const leftLabelWidth = hasLeftAxisLabel ? 28 : 0; // reserved width for vertical y-label column
            const leftLabelGap = hasLeftAxisLabel ? 8 : 0;    // gap between y-label and plot
            const plotInset = hasLeftAxisLabel ? 6 : 0;       // inset used in body for endpoints
            const totalLeftGutter = leftLabelWidth + leftLabelGap + plotInset;
            const totalRightInset = plotInset;
            const innerWidthCalc = `calc(100% - ${totalLeftGutter + totalRightInset}px)`;
            const innerMarginLeft = `${totalLeftGutter}px`;
            
            return (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '8px' }}>
                    {/* The Line */}
                    <div data-timeline-axis={target} style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, height: '4px', background: axisColor, borderRadius: '2px', position: 'relative' }}></div>
                    {/* The Labels below */}
                    <div style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold' }}>
                           {(chartData.isRangeSlider || chartData.isSingleSlider) ? minIndex : "n=0"}
                        </span>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold' }}>
                           {(chartData.isRangeSlider || chartData.isSingleSlider) ? maxIndex : "now"}
                        </span>
                    </div>
                </div>
            );
        };

        const renderBody = () => (
             <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                 {/* Y-Axis Label for Range/Single Slider (Left side, vertical) */}
                 {(chartData.isRangeSlider || chartData.isSingleSlider) && (
                     <div style={{ 
                         writingMode: 'vertical-rl', 
                         transform: 'rotate(180deg)', // Standard rotation for left-side axis labels
                         fontSize: '12px', 
                         color: '#999', 
                         fontWeight: 'bold', 
                         textAlign: 'center', 
                         marginRight: '8px',
                         width: '28px',
                         minWidth: '28px',
                         whiteSpace: 'nowrap',
                         alignSelf: 'center' // Center vertically relative to chart
                     }}>
                         Sequence of Interactions
                     </div>
                 )}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1, position: 'relative' }}>
                 
                 {/* 
                    For Range Slider, user wants VERTICAL connecting lines.
                    This implies we are connecting points ACROSS rows (interactions), not within a row.
                 */}
                 
                 {chartData.isRangeSlider || chartData.isSingleSlider ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                        {/* SVG Overlay for Vertical Lines */}
                        <svg style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                            {sortedEntries.map(([label, records], index) => {
                                if (index === sortedEntries.length - 1) return null; // Last row has no next row to connect to
                                
                                // Current Row
                                const currentRecord = records[0]; 
                                if (!currentRecord || !currentRecord.select) return null;
                                const curMin = currentRecord.select.index;
                                const curMax = currentRecord.unselect ? currentRecord.unselect.index : maxIndex;
                                
                                // Next Row
                                const nextEntry = sortedEntries[index + 1];
                                const nextRecord = nextEntry[1][0];
                                if (!nextRecord || !nextRecord.select) return null;
                                const nextMin = nextRecord.select.index;
                                const nextMax = nextRecord.unselect ? nextRecord.unselect.index : maxIndex;
                                
                                const rowHeight = 24;
                                const dotRadius = 4; // 8px circle, radius 4
                                const gap = 8;
                                const y1 = (index * (rowHeight + gap)) + dotRadius;
                                const y2 = ((index + 1) * (rowHeight + gap)) + dotRadius;
                                
                                const x1_min = ((curMin - minIndex) / rangeSpan) * 100;
                                const x2_min = ((nextMin - minIndex) / rangeSpan) * 100;
                                
                                const x1_max = ((curMax - minIndex) / rangeSpan) * 100;
                                const x2_max = ((nextMax - minIndex) / rangeSpan) * 100;

                                // Opacity for lines
                                 const totalRows = sortedEntries.length;
                                 const relativeIndex = index / (totalRows - 1 || 1);
                                 // Oldest is index 0 (top), newest is last (bottom).
                                 // Make newest darker using interpolateOranges.
                                 const color = interpolateOranges(0.3 + (relativeIndex * 0.7));
                                 
                                 return (
                                     <g key={index}>
                                         {/* Min Connection */}
                                         <line 
                                             x1={`${x1_min}%`} y1={y1} 
                                             x2={`${x2_min}%`} y2={y2} 
                                             stroke={color} strokeWidth="2" 
                                         />
                                         {/* Max Connection (Range slider only) */}
                                         {chartData.isRangeSlider && (
                                             <line 
                                                 x1={`${x1_max}%`} y1={y1} 
                                                 x2={`${x2_max}%`} y2={y2} 
                                                 stroke={color} strokeWidth="2" 
                                             />
                                         )}
                                     </g>
                                 );
                             })}
                         </svg>

                         {/* Rows with Points (No horizontal lines) */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {sortedEntries.map(([label, records], index) => {
                                  // Calculate color for the row
                                  const totalRows = sortedEntries.length;
                                  const relativeIndex = index / (totalRows - 1 || 1);
                                  const color = interpolateOranges(0.3 + (relativeIndex * 0.7));
 
                                  return (
                                  <div key={label} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                                      {/* Timeline takes full space with safe inset for endpoint visibility */}
                                      <div style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: '100%', background: 'transparent', borderRadius: '3px', zIndex: 0 }}>
                                          {records.map((record, i) => {
                                               if (!record.select) return null;
                                               const start = record.select.index;
                                               const end = record.unselect ? record.unselect.index : maxIndex;
                                               
                                               const left = ((start - minIndex) / rangeSpan) * 100;
                                               const right = ((end - minIndex) / rangeSpan) * 100;
                                               const width = Math.max(0, ((end - start) / rangeSpan) * 100);
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
                                               
                                              // Render Points ONLY
                                               return (
                                                  <div key={i} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                                        {/* Min Point */}
                                                        <div
                                                            {...lowTooltipProps}
                                                            style={{
                                                                ...lowTooltipProps.style,
                                                                position: 'absolute',
                                                                left: `calc(${left}% - 8px)`,
                                                                top: '-4px',
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'transparent',
                                                                zIndex: 2
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
                                                                    border: `1px solid ${d3.color(color).darker()}`,
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                       {/* Max Point (Range slider only) */}
                                                       {chartData.isRangeSlider && (
                                                           <div
                                                               {...highTooltipProps}
                                                               style={{
                                                                   ...highTooltipProps.style,
                                                                   position: 'absolute',
                                                                   left: `calc(${right}% - 8px)`,
                                                                   top: '-4px',
                                                                   width: '16px',
                                                                   height: '16px',
                                                                   borderRadius: '50%',
                                                                   backgroundColor: 'transparent',
                                                                   zIndex: 2
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
                                                                       border: `1px solid ${d3.color(color).darker()}`,
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
                     // Default rendering for other components (Checkbox, Dropdown, Input)
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1 }}>
                         {sortedEntries.map(([label, records]) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                                  {/* Timeline takes full space */}
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: rowBg, borderRadius: '3px', zIndex: 0 }}>
                                      {records.map((record, i) => {
                                           if (!record.select) return null;
                                           const startRaw = record.select.index;
                                           const endRaw = record.unselect ? record.unselect.index : maxIndex;
                                           const start = (startRaw ?? 0) - indexOffset;
                                           const end = (endRaw ?? maxIndex) - indexOffset;
                                           
                                           const left = ((start - minIndex) / (displaySpan || 1)) * 100;
                                           const width = Math.max(0, ((end - start) / (displaySpan || 1)) * 100);
                                           
                                           // Calculate color based on start time relative to maxIndex (now)
                                           // rangeSpan is the total time domain.
                                           // relativeTime = 0 (start) to 1 (end/now).
                                           const relativeTime = (start - minIndex) / (displaySpan || 1);
                                           // Map 0..1 to 0.3..1.0 color scale
                                           const color = interpolateOranges(0.3 + (relativeTime * 0.7));
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
                                                  style={{
                                                   ...tooltipProps.style,
                                                   position: 'absolute',
                                                   left: `${left}%`,
                                                   width: `${width}%`,
                                                   minWidth: '8px',
                                                   height: '100%',
                                                   backgroundColor: color, 
                                                   border: `1px solid ${d3.color(color).darker()}`
                                               }} />
                                           );
                                      })}
                                  </div>
                                  
                                  {/* Label overlay on top */}
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
                <div style={{ padding: '15px', minWidth: '100%', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}>
                    {renderBody()}
                </div>
            );
        }

        // Full view (default) - used for Single Select Dropdown tooltip/dropdown
        return (
            <div style={{ padding: '15px', minWidth: '100%', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}>
                {renderBody()}
                {renderHeader()}
            </div>
        );
    }

    // Default D3 chart (always full)
    return <div ref={chartRef} className="sequence-chart"></div>;
};

export default Chart;
