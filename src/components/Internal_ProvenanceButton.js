import { Button } from 'primereact/button/button.esm.js';
import { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Tooltip } from 'react-tooltip';
import Chart from "./Chart.js"
import useProvenance from './hooks/useProvenance.js';
import useWidgetColors from './hooks/useWidgetColors.js';
import Internal_Chart from './Internal_Chart.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ProvenanceContext from './contexts/provenance.js';

const Internal_ProvenanceButton = ({ prov }) => {
    const [open, setOpen] = useState()
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [widgetColors] = useWidgetColors()
    const [, setRevertedValues] = useState({}); // Local state for something else? No, use context
    const context = useContext(ProvenanceContext);
    const setRevertedValuesContext = context.actions.setRevertedValues;
    const [dropdownWidth, setDropdownWidth] = useState(0)
    const [dropdownLeft, setDropdownLeft] = useState(0)
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    const handleInteractionClick = (clickedInteraction) => {
        if (!prov || !prov.registeredWidgets || !registeredComponents) return;

        const targetTime = clickedInteraction.time;
        const newRevertedValues = {};

        const widgetIds = Array.from(prov.registeredWidgets.keys());
        for (const widgetId of widgetIds) {
            const widgetProvenance = registeredComponents.get(widgetId);
            if (!widgetProvenance || !widgetProvenance.detailedData) continue;

            const detailedDataEntries = widgetProvenance.detailedData instanceof Map
                ? Array.from(widgetProvenance.detailedData.entries())
                : [];

            let lastValueAtTime = null;
            let hasHistoryAtTime = false;

            // Sort entries by time to find the latest one before or at targetTime
            const sortedEntries = [];

            // Check if this is GenericProvenance (NumericProvenance/TextProvenance)
            const isGenericProvenance = detailedDataEntries.length > 0 &&
                typeof detailedDataEntries[0][0] === 'number' &&
                detailedDataEntries[0][1] &&
                typeof detailedDataEntries[0][1] === 'object' &&
                !Array.isArray(detailedDataEntries[0][1]) &&
                'value' in detailedDataEntries[0][1];

            const isSelectionProvenance = detailedDataEntries.length > 0 &&
                typeof detailedDataEntries[0][0] === 'string' &&
                Array.isArray(detailedDataEntries[0][1]);

            if (isGenericProvenance) {
                for (const [, record] of detailedDataEntries) {
                    if (record && record.time) {
                        const time = record.time instanceof Date ? record.time : new Date(record.time);
                        if (time <= targetTime) {
                            sortedEntries.push({ time, value: record.value });
                            hasHistoryAtTime = true;
                        }
                    }
                }
                if (sortedEntries.length > 0) {
                    sortedEntries.sort((a, b) => b.time - a.time);
                    lastValueAtTime = sortedEntries[0].value;
                }
            } else if (isSelectionProvenance) {
                // For SelectionProvenance, each checkbox/item has its own history.
                // We need to find the status of ALL items at that time.
                const selectedLabelsAtTime = [];
                for (const [label, records] of detailedDataEntries) {
                    const labelHistory = [];
                    for (const record of records) {
                        if (record.select && record.select.time) {
                            const time = record.select.time instanceof Date ? record.select.time : new Date(record.select.time);
                            if (time <= targetTime) {
                                labelHistory.push({ time, type: 'select' });
                                hasHistoryAtTime = true;
                            }
                        }
                        if (record.unselect && record.unselect.time) {
                            const time = record.unselect.time instanceof Date ? record.unselect.time : new Date(record.unselect.time);
                            if (time <= targetTime) {
                                labelHistory.push({ time, type: 'unselect' });
                                hasHistoryAtTime = true;
                            }
                        }
                    }
                    if (labelHistory.length > 0) {
                        labelHistory.sort((a, b) => b.time - a.time);
                        if (labelHistory[0].type === 'select') {
                            selectedLabelsAtTime.push(label);
                        }
                    }
                }
                // SelectionProvenance returns array for checkboxes or single value for radio
                if (widgetId.includes('radiobutton')) {
                    lastValueAtTime = selectedLabelsAtTime[0] || null;
                } else {
                    lastValueAtTime = selectedLabelsAtTime;
                }
            }

            if (hasHistoryAtTime) {
                newRevertedValues[widgetId] = lastValueAtTime;
            }
        }

        setRevertedValuesContext(newRevertedValues);
    };

    // Use D3 chromatic scale for color allocation (same as AggregateView)
    const colorScale = useMemo(() => scaleOrdinal(schemeCategory10), []);

    // Build sequence of all interactions from all provenances
    const interactionSequence = useMemo(() => {
        if (!prov || !prov.registeredWidgets || !registeredComponents) return [];

        const allInteractions = [];
        const widgetIds = Array.from(prov.registeredWidgets.keys());

        // Create color mapping (same as AggregateView)
        const widgetIdToIndex = new Map();
        widgetIds.forEach((id, idx) => widgetIdToIndex.set(id, idx));

        // Collect all interactions from all widgets
        for (const widgetId of widgetIds) {
            const widgetProvenance = registeredComponents.get(widgetId);
            if (!widgetProvenance || !widgetProvenance.detailedData) continue;

            // Get color for this widget
            const colorIndex = widgetIdToIndex.get(widgetId);
            const color = widgetColors[widgetId] || colorScale(colorIndex);

            // Extract interactions from detailedData
            // For different provenance types, detailedData structure varies:
            // - For NumericProvenance/TextProvenance (GenericProvenance): Map<index, {value, time, index}>
            // - For SelectionProvenance: Map<checkboxLabel, Array<TemporalSelectionRecord>>
            // - For SuperProvenance: Map<widgetId, Array<TemporalRecord>>
            const detailedDataEntries = widgetProvenance.detailedData instanceof Map
                ? Array.from(widgetProvenance.detailedData.entries())
                : [];

            // Check if this is GenericProvenance (NumericProvenance/TextProvenance)
            // GenericProvenance uses index as key and {value, time, index} as value
            const isGenericProvenance = detailedDataEntries.length > 0 &&
                typeof detailedDataEntries[0][0] === 'number' &&
                detailedDataEntries[0][1] &&
                typeof detailedDataEntries[0][1] === 'object' &&
                !Array.isArray(detailedDataEntries[0][1]) &&
                'value' in detailedDataEntries[0][1];

            // Check if this is SelectionProvenance
            const isSelectionProvenance = detailedDataEntries.length > 0 &&
                typeof detailedDataEntries[0][0] === 'string' &&
                Array.isArray(detailedDataEntries[0][1]) &&
                detailedDataEntries[0][1].length > 0 &&
                detailedDataEntries[0][1][0]?.select;

            // Flatten all interactions for this widget
            if (isGenericProvenance) {
                // For GenericProvenance (TextProvenance, NumericProvenance)
                // detailedData is Map<index, {value, time, index}>
                for (const [indexKey, record] of detailedDataEntries) {
                    if (record && typeof record === 'object' && 'time' in record) {
                        allInteractions.push({
                            widgetId,
                            color,
                            time: record.time instanceof Date ? record.time : (record.time ? new Date(record.time) : null),
                            index: record.index ?? indexKey,
                            value: record.value
                        });
                    }
                }
            } else if (isSelectionProvenance) {
                // For SelectionProvenance
                // detailedData is Map<checkboxLabel, Array<TemporalSelectionRecord>>
                for (const [key, records] of detailedDataEntries) {
                    if (Array.isArray(records)) {
                        for (const record of records) {
                            if (record) {
                                // Handle select/unselect records
                                if (record.select) {
                                    allInteractions.push({
                                        widgetId,
                                        color,
                                        time: record.select.time instanceof Date ? record.select.time : (record.select.time ? new Date(record.select.time) : null),
                                        index: record.select.index,
                                        value: key
                                    });
                                }
                                // Optionally include unselect records
//                                 if (record.unselect) {
//                                     allInteractions.push({
//                                         widgetId,
//                                         color,
//                                         time: record.unselect.time instanceof Date ? record.unselect.time : (record.unselect.time ? new Date(record.unselect.time) : null),
//                                         index: record.unselect.index,
//                                         value: key
//                                     });
//                                 }
                            }
                        }
                    }
                }
            } else {
                // Fallback for other types (shouldn't happen, but handle gracefully)
                for (const [key, records] of detailedDataEntries) {
                    if (Array.isArray(records)) {
                        for (const record of records) {
                            if (record && (record.time || record.index !== undefined)) {
                                allInteractions.push({
                                    widgetId,
                                    color,
                                    time: record.time instanceof Date ? record.time : (record.time ? new Date(record.time) : null),
                                    index: record.index,
                                    value: key
                                });
                            }
                        }
                    }
                }
            }
        }

        // Sort by time first, then by index
        allInteractions.sort((a, b) => {
            if (a.time && b.time) {
                const timeDiff = a.time.getTime() - b.time.getTime();
                if (timeDiff !== 0) return timeDiff;
            }
            // Fallback to index if times are equal or missing
            return (a.index || 0) - (b.index || 0);
        });

        // Calculate width for each box: divide container width equally among all interactions
        // If only one interaction, it takes full width (100%)
        // If multiple interactions, each gets equal share
        const interactionCount = allInteractions.length;
        if (interactionCount > 0) {
            // Each box gets equal width (100% / count)
            const boxWidthPercent = 100 / interactionCount;
            allInteractions.forEach(interaction => {
                interaction.width = `${boxWidthPercent}%`;
            });
        }

        return allInteractions;
    }, [prov, registeredComponents, widgetColors, colorScale]);

    const handleClickOutside = (event) => {
        if (buttonRef.current && !buttonRef.current.contains(event.target) &&
            dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            console.log('Clicked outside the button!');
            setOpen(false); // Example action: hide content
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Measure AggregateView width and position when open state changes
    useEffect(() => {
        if (open) {
            const updateDimensions = () => {
                // Find AggregateView by looking for the container with colored boxes
                const coloredBoxes = document.querySelectorAll('[data-tooltip-id^="widget-tooltip-"]');
                if (coloredBoxes.length > 0) {
                    // Find the parent container that holds all the colored boxes
                    const aggregateContainer = coloredBoxes[0].closest('div[style*="display: flex"]');
                    if (aggregateContainer) {
                        const width = aggregateContainer.offsetWidth;
                        setDropdownWidth(width);

                        // Calculate left offset relative to the positioned parent
                        const parentContainer = buttonRef.current?.closest('div[style*="position: relative"]');
                        if (parentContainer) {
                            const aggregateRect = aggregateContainer.getBoundingClientRect();
                            const parentRect = parentContainer.getBoundingClientRect();
                            const leftOffset = aggregateRect.left - parentRect.left;
                            setDropdownLeft(leftOffset);
                        }
                    }
                } else {
                    // Fallback: try to find by sibling relationship
                    const buttonContainer = buttonRef.current?.closest('div[style*="display: flex"][style*="position: relative"]');
                    if (buttonContainer) {
                        // Find AggregateView as a sibling
                        const siblings = Array.from(buttonContainer.children);
                        const aggregateView = siblings.find(child => {
                            return child !== buttonRef.current?.parentElement &&
                                child.querySelector('[data-tooltip-id^="widget-tooltip-"]');
                        });
                        if (aggregateView) {
                            setDropdownWidth(aggregateView.offsetWidth);
                            const aggregateRect = aggregateView.getBoundingClientRect();
                            const parentRect = buttonContainer.getBoundingClientRect();
                            const leftOffset = aggregateRect.left - parentRect.left;
                            setDropdownLeft(leftOffset);
                        }
                    }
                }
            };

            // Small delay to ensure DOM is ready
            const timeout = setTimeout(updateDimensions, 10);
            updateDimensions();

            // Update on window resize
            window.addEventListener('resize', updateDimensions);
            // Also update periodically to catch AggregateView width changes
            const interval = setInterval(updateDimensions, 200);

            return () => {
                clearTimeout(timeout);
                window.removeEventListener('resize', updateDimensions);
                clearInterval(interval);
            };
        } else {
            setDropdownWidth(0);
            setDropdownLeft(0);
        }
    }, [open]);

    const TEMPORAL_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSIjMmMzZTUwIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0iIzJjM2U1MCIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="
    const AGGREGATE_B64 = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iLTMgLTMgNjcuNDg3IDEwNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQogIDxnPg0KICA8cGF0aCBzdHJva2U9IiMyYzNlNTAiIHN0cm9rZS13aWR0aD0iNXB4IiBmaWxsPSJub25lIiBkPSJNMzcuMjY3LDgzLjY4MWMtMi4zNDYsNS45MzItNC4xMzMsMTQuMTgzLDIuNjU1LDE1Ljk5YzEwLjQyNywyLjc3MiwxMS45MDctMTIuODk2LDExLjkwNy0xMi44OTYNCglMMzcuMjY3LDgzLjY4MXoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTYwLjc0Miw2My4zODZjMS41NTgtOC4xMTQsMS40NjctMjEuOTU3LTguMjcxLTI1LjM5NGMtMi40LTAuODQ4LTExLjQ2Ny0zLjAwNi0xNS4xMjYsMTIuOTU2DQoJYy0yLjY1MSwxMS42MTIsMS40ODgsMjUuNTM5LDEuNDg4LDI1LjUzOWwxNC43MjUsMy4xMzJDNTMuNTYsNzkuNjE4LDU5LjY5OCw2OC44MTQsNjAuNzQyLDYzLjM4NnoiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTIxLjM2Niw0Ny4zMTljMS43MTYsNi4xNDIsMi42MzMsMTQuNTM0LTQuMzExLDE1LjYyM0M2LjQsNjQuNjExLDYuNTY1LDQ4Ljg3NSw2LjU2NSw0OC44NzVMMjEuMzY2LDQ3LjMxOXoNCgkiLz4NCiAgPHBhdGggc3Ryb2tlPSIjMmMzZTUwIiBzdHJva2Utd2lkdGg9IjVweCIgZmlsbD0ibm9uZSIgZD0iTTAuMTQ2LDI0LjY3OUMtMC41NTUsMTYuNDQ3LDAuOTgsMi42OSwxMS4wMjgsMC4yODdDMTMuNS0wLjMwNiwyMi43NDEtMS41MDEsMjQuNzExLDE0Ljc1NQ0KCWMxLjQzMSwxMS44MjctNC4xNTEsMjUuMjQzLTQuMTUxLDI1LjI0M2wtMTQuOTcsMS41NzVDNS41ODksNDEuNTczLDAuNjEyLDMwLjE5LDAuMTQ2LDI0LjY3OXoiLz4NCiAgICA8L2c+DQo8L3N2Zz4="

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "1rem" }}>
                <Button ref={buttonRef} onClick={() => setOpen(prev => !prev)} style={{ width: "40px", height: "40px" }} text icon={(options) => open ? <img width={30} height={30} src={TEMPORAL_B64} /> : <img width={30} height={30} src={AGGREGATE_B64} />} />
                {/* <Tooltip
                id={"open-tooltip-"}
                events={['click']}
                opacity={1}
                style={{ zIndex: 100 }}
            >
                <Internal_Chart prov={prov} />
                </Tooltip> */}
            </div>
            {open && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        left: dropdownLeft > 0 ? `${dropdownLeft}px` : 0,
                        width: dropdownWidth > 0 ? `${dropdownWidth}px` : 'auto',
                        top: '100%',
                        marginTop: '0.5rem',
                        padding: '1rem',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                    {/* Sequence of colored boxes representing all interactions - at the top */}
                    {interactionSequence.length > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            marginBottom: '1rem'
                        }}>
                            {interactionSequence.map((interaction, idx) => (
                                <div key={idx} style={{ width: interaction.width, flexShrink: 0 }}>
                                    <div
                                        data-tooltip-id={`interaction-tooltip-${idx}`}
                                        data-tooltip-html={`<div>Widget: ${interaction.widgetId}<br>Time: ${interaction.time ? interaction.time.toLocaleString() : 'N/A'}<br>Index: ${interaction.index ?? 'N/A'}</div>`}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            backgroundColor: interaction.color,
                                            opacity: 0.6,
                                            border: '1px solid rgba(0, 0, 0, 0.3)',
                                            cursor: 'pointer',
                                            transition: 'opacity 0.2s ease, width 0.3s ease'
                                        }}
                                        onClick={() => handleInteractionClick(interaction)}
                                        onMouseEnter={(e) => e.target.style.opacity = 1}
                                        onMouseLeave={(e) => e.target.style.opacity = 0.6}
                                    />
                                    <Tooltip
                                        id={`interaction-tooltip-${idx}`}
                                        events={['hover']}
                                        opacity={1}
                                        style={{ zIndex: 100 }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Rows for each registered component */}
                    {prov && prov.registeredWidgets && Array.from(prov.registeredWidgets.keys()).map((target, index) => (
                        <div key={target} style={{
                            position: 'relative',
                            borderBottom: index < prov.registeredWidgets.size - 1 ? '1px solid #eee' : 'none',
                            minHeight: '32px' // Ensure minimum height
                        }}>
                            <div style={{ padding: '0.5rem', position: 'relative', zIndex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: '#999' }}>{target}</label>
                            </div>

                            {/* Aligned colored boxes matching the interaction sequence - Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                display: 'flex',
                                width: '100%',
                                height: '100%',
                                zIndex: 2, // On top of label
                                pointerEvents: 'none' // Allow clicks to pass through
                            }}>
                                {interactionSequence.map((interaction, idx) => (
                                    <div key={idx} style={{
                                        width: interaction.width,
                                        height: '100%',
                                        backgroundColor: interaction.widgetId === target ? interaction.color : 'transparent',
                                        opacity: 0.45 // 55% transparent
                                    }} />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Arrow and title at the bottom */}
                    <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%'
                    }}>
                        {/* Arrow from left to right */}
                        <div style={{ width: '100%', position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: '90%',
                                height: '2px',
                                backgroundColor: '#333',
                                position: 'relative',
                                margin: '0 auto'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    right: '-8px',
                                    top: '-6px',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid #333',
                                    borderTop: '6px solid transparent',
                                    borderBottom: '6px solid transparent'
                                }}></div>
                            </div>
                        </div>
                        {/* Title below arrow */}
                        <p style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            textAlign: 'center'
                        }}>
                            sequence of interactions
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}

export default Internal_ProvenanceButton 