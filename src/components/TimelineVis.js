import { useMemo } from "react";
import { interpolateOranges } from "d3";
import * as d3 from "d3";
import { formatTemporalTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';

const TimelineVis = ({
    records,
    maxIndex,
    leftInsetPx = 0,
    tooltipId,
    widgetId,
    value,
    kind = 'single-selection',
}) => {
    const bars = useMemo(() => {
        if (!records || !Array.isArray(records)) return [];
        
        const indexOffset = 1;
        const displayMax = Math.max((maxIndex ?? 0) - indexOffset, 1);

        return records.map((record, i) => {
            if (!record.select) return null;
            const startRaw = record.select.index;
            const endRaw = record.unselect ? record.unselect.index : maxIndex;
            const start = Math.max(0, (startRaw ?? 0) - indexOffset);
            const end = Math.max(start, (endRaw ?? maxIndex) - indexOffset);
            
            const totalRange = displayMax > 0 ? displayMax : 1;
            const left = (start / totalRange) * 100;
            // Use a minimal width if start and end are close, but primarily position based
            // The user asked to make "The most recent interaction shows up as a very small line, instead of a rectangle"
            // This happens when width is very small (e.g. 0).
            // We should enforce a minimum width or use calc.
            // Let's use a minimum pixel width for visibility.
            // But we are using %.
            // Let's ensure at least a small % or use min-width style.
            
            const width = Math.max(0, ((end - start) / totalRange) * 100);

            // Color by recency using the same brown-yellow scheme (interpolateOranges)
            // Most recent (start near maxIndex) -> darker; older -> lighter
            const relativeTime = totalRange > 0 ? (start / totalRange) : 0;
            const color = interpolateOranges(0.3 + (relativeTime * 0.7));
            const borderColor = d3.color(color)?.darker()?.formatHex?.() || "#AA6E00";
            
            return {
                key: i,
                left: `${left}%`,
                width: `${width}%`,
                title: `Start: ${start}, End: ${end}`,
                color,
                borderColor,
                record,
            };
        }).filter(Boolean);
    }, [records, maxIndex]);

    return (
        <div style={{ 
            position: 'relative', 
            height: '24px', 
            background: 'transparent', // Removed dark background
            width: '100%',
            flex: 1 // Allow it to grow
        }}>
            {/* Base line removed as requested */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${leftInsetPx}px`, right: 0 }}>
                {bars.map(bar => {
                    const tooltipProps = getTooltipAnchorProps(
                        tooltipId,
                        () => formatTemporalTooltip({
                            label: widgetId,
                            value,
                            record: bar.record,
                            kind,
                        })
                    );

                    return (
                    <div
                        key={bar.key}
                        data-provenance-timeline-bar="true"
                        {...tooltipProps}
                        style={{
                            ...tooltipProps.style,
                            position: 'absolute',
                            left: bar.left,
                            width: bar.width,
                            minWidth: '8px', // Match PW's practical hover target for short durations
                            height: '24px',
                            top: '0px',
                            backgroundColor: bar.color, // Orange scale by recency
                            opacity: 1.0, // Solid opacity
                            border: `1px solid ${bar.borderColor}`, // Slight border for definition
                            zIndex: 0 // Behind text if needed, or allow text to be on top
                        }}
                    />
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineVis;
