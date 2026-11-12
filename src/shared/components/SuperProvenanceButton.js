import { Button } from 'primereact/button/button.esm.js';
import { useState, useRef, useEffect, useMemo, useContext } from 'react';
import SuperTemporalView from './SuperTemporalView.js';
import useProvenance from '../../provenance/hooks/useProvenance.js';
import useWidgetColors from '../../provenance/hooks/useWidgetColors.js';
import useWidgetRegistry from '../../provenance/hooks/useWidgetRegistry.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ProvenanceContext from '../../provenance/ProvenanceContext.js';
import {
    buildSuperInteractionSequence,
    getSuperWidgetIds,
    restoreRegisteredWidgetsAtTime,
} from '../logic/superProvenanceData.js';

const SuperProvenanceButton = ({ id, prov, scalability, temporalBrush }) => {
    const [open, setOpen] = useState()
    const [registeredComponents] = useProvenance()
    const [widgetColors] = useWidgetColors()
    const { registrations } = useWidgetRegistry();
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
        restoreRegisteredWidgetsAtTime({
            registrations,
            widgetIds,
            targetTime,
            source: "history",
        });

        for (const widgetId of widgetIds) {
            if (registrations.has(widgetId)) continue;
            const widgetProvenance = registeredComponents.get(widgetId);
            if (!widgetProvenance || !widgetProvenance.detailedData) continue;

            const detailedDataEntries = widgetProvenance.detailedData instanceof Map
                ? Array.from(widgetProvenance.detailedData.entries())
                : [];

            let lastValueAtTime = null;
            let hasHistoryAtTime = false;

            const sortedEntries = [];

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

    const colorScale = useMemo(() => scaleOrdinal(schemeCategory10), []);

    const interactionSequence = useMemo(() => {
        return buildSuperInteractionSequence({
            superProvenance: prov,
            registeredComponents,
            widgetColors,
            getColor: index => colorScale(index),
        });
    }, [prov, registeredComponents, widgetColors, colorScale]);

    const temporalWidgetIds = useMemo(
        () => getSuperWidgetIds(prov),
        [prov, registeredComponents]
    );

    const handleClickOutside = (event) => {
        if (buttonRef.current && !buttonRef.current.contains(event.target) &&
            dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (open) {
            const updateDimensions = () => {
                const coloredBoxes = document.querySelectorAll('[data-tooltip-id^="widget-tooltip-"]');
                if (coloredBoxes.length > 0) {
                    const aggregateContainer = coloredBoxes[0].closest('div[style*="display: flex"]');
                    if (aggregateContainer) {
                        const width = aggregateContainer.offsetWidth;
                        setDropdownWidth(width);

                        const parentContainer = buttonRef.current?.closest('div[style*="position: relative"]');
                        if (parentContainer) {
                            const aggregateRect = aggregateContainer.getBoundingClientRect();
                            const parentRect = parentContainer.getBoundingClientRect();
                            const leftOffset = aggregateRect.left - parentRect.left;
                            setDropdownLeft(leftOffset);
                        }
                    }
                } else {
                    const buttonContainer = buttonRef.current?.closest('div[style*="display: flex"][style*="position: relative"]');
                    if (buttonContainer) {
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

            const timeout = setTimeout(updateDimensions, 10);
            updateDimensions();

            window.addEventListener('resize', updateDimensions);
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
                <Button
                    ref={buttonRef}
                    aria-label="Toggle SuperProvenance temporal view"
                    onClick={() => setOpen(previous => !previous)}
                    style={{ width: "40px", height: "40px" }}
                    text
                    icon={() => open
                        ? <img width={30} height={30} src={TEMPORAL_B64} />
                        : <img width={30} height={30} src={AGGREGATE_B64} />
                    }
                />
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
                    <SuperTemporalView
                        id={id}
                        interactions={interactionSequence}
                        widgetIds={temporalWidgetIds}
                        onRestore={handleInteractionClick}
                        scalability={scalability}
                        temporalBrush={temporalBrush}
                    />
                </div>
            )}
        </>
    )
}

export default SuperProvenanceButton;
