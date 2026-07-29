import { Dropdown as Dropdown_ } from 'primereact/dropdown/dropdown.esm.js';
import { useEffect, useRef, useState, useMemo } from 'react';
import SelectionProvenance from '../strategies/provenance/SelectionProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import { interpolateOranges } from 'd3';
import Bars from 'scents';
import useRevertedValue from './hooks/useRevertedValue.js';
import TimelineVis from './TimelineVis.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import {
    formatAggregateTooltip,
    getAggregateTooltipRecord,
    getTooltipAnchorProps,
} from './provenanceTooltip.js';

import useElementSize from './hooks/useElementSize.js';
import DropdownBarLabel from './DropdownBarLabel.js';

const SingleSelectItem = ({ option, guidance, showTimeline, widgetId }) => {
    const [containerRef, { width: containerWidth }] = useElementSize();
    const tooltipId = useProvenanceTooltip();
    const timelineVersion = guidance?.domain?.get?.("index")?.[1] ?? 0;

    const timelineData = useMemo(() => {
        if (!showTimeline || !guidance?.detailedData) return null;
        
        const detailedData = guidance.detailedData;
        const records = detailedData.get(option.value);
        if (!records) return null;

        // Calculate max index for the entire group
        let maxIndex = 0;
        const allRecords = Array.from(detailedData.values()).flat();
        for (const record of allRecords) {
            if (record.select?.index > maxIndex) maxIndex = record.select.index;
            if (record.unselect?.index > maxIndex) maxIndex = record.unselect.index;
        }
        
        // NOTE: The issue "most recent interaction does not show up" might be because
        // maxIndex is exactly the start index of the latest interaction, so width = 0.
        // We need to ensure the domain extends BEYOND the last start index to represent "now".
        // If the latest action is a SELECT at index K, and maxIndex is K, then width = K - K = 0.
        // We should treat "now" as at least maxIndex + 1 or use the domain upper bound which should be higher.
        
        const domainMax = guidance.domain?.get ? guidance.domain.get("index")?.[1] : 0;
        const displayMax = Math.max(maxIndex, domainMax || 0) + 1; // Add 1 to ensure current open interval has width

        return { records, maxIndex: displayMax };
    }, [showTimeline, guidance, option.value, timelineVersion]);

    const aggregateTooltipProps = !showTimeline
        ? getTooltipAnchorProps(
            tooltipId,
            formatAggregateTooltip({
                label: widgetId,
                value: option.value,
                record: getAggregateTooltipRecord(
                    guidance,
                    option.value,
                    'single-selection'
                ),
                kind: 'single-selection',
            }),
            { focusable: false }
        )
        : {};

    return (
        <div
            ref={containerRef}
            {...aggregateTooltipProps}
            style={{
                ...aggregateTooltipProps.style,
                position: 'relative',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                width: '100%',
                flex: 1,
            }}
        >
            {!showTimeline && containerWidth > 0 && guidance && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <Bars
                        guidance={guidance}
                        orientationScheme={interpolateOranges}
                        barKeys={[option.value]}
                        encodings={{
                            orientation: "horizontal",
                            positionDomain: "interactions",
                            colorDomain: "index",
                        }}
                        width={containerWidth}
                        height={32}
                        layout="checkbox"
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            )}

            {/* Render Timeline In-Situ (Background Layer) */}
            {showTimeline && timelineData && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'flex', alignItems: 'center' }}>
                    <TimelineVis
                        records={timelineData.records}
                        maxIndex={timelineData.maxIndex}
                        tooltipId={tooltipId}
                        widgetId={widgetId}
                        value={option.value}
                        kind="single-selection"
                    />
                </div>
            )}

            <DropdownBarLabel
                value={option.value}
                guidance={guidance}
                orientationScheme={interpolateOranges}
                containerWidth={containerWidth}
                showTimeline={showTimeline}
            >
                {option.label || option.value}
            </DropdownBarLabel>
        </div>
    );
};

const SingleSelectDropdown = (props) => {
    const [value, setValue] = useState(null);
    const [revertedValue] = useRevertedValue(props.id);
    const [showTimeline, setShowTimeline] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === props.id) {
                const isOpen = e.detail.open;
                setShowTimeline(isOpen);
                // Programmatically open/close the dropdown
                // PrimeReact Dropdown exposes 'show' and 'hide' methods via ref?
                // Or we can simulate click.
                // Looking at PrimeReact docs/source, Dropdown has show() and hide() methods on the ref instance.
                if (dropdownRef.current) {
                    if (isOpen) {
                        dropdownRef.current.show();
                    } else {
                        dropdownRef.current.hide();
                    }
                }
            }
        };
        window.addEventListener('provenance-dropdown-toggle', handleToggle);
        return () => window.removeEventListener('provenance-dropdown-toggle', handleToggle);
    }, [props.id]);

    useEffect(() => {
        if (revertedValue !== undefined) {
            setValue(revertedValue);
            if (provRef.current) {
                provRef.current.insert(revertedValue);
                lastKeyRef.current = revertedValue;
            }
        }
    }, [revertedValue]);

    const [registeredComponents, setRegisteredComponents] = useProvenance();
    const provRef = useRef(null);
    const lastKeyRef = useRef(null);
    const tooltipLabel = props['data-label'] || props.id;

    useEffect(() => {
        const p = new SelectionProvenance();
        p.tooltipLabel = tooltipLabel;
        provRef.current = p;
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map();
            newMap.set(props.id, p);
            return newMap;
        });
        p.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
            setRegisteredComponents(prev => {
                if (prev instanceof Map) {
                    return new Map(prev);
                }
                return new Map();
            });
        });
    }, []);

    const onChange = (val) => {
        setValue(val);
        const key = JSON.stringify([val]);
        if (lastKeyRef.current === key) return;
        provRef.current.insert([val], { caller: val });
        lastKeyRef.current = key;
    };

    const itemTemplate = (option) => {
        return <SingleSelectItem
            option={option}
            guidance={provRef.current}
            showTimeline={showTimeline}
            widgetId={tooltipLabel}
        />;
    };

    // Custom panel footer for the timeline axis
    const panelFooterTemplate = () => {
        if (!showTimeline) return null;
        return (
             <div style={{ display: 'flex', flexDirection: 'column', width: '100%', borderTop: '1px solid #333' }}>
                 {/* The Line */}
                 <div style={{ width: '100%', height: '4px', background: '#555', borderRadius: '2px', position: 'relative' }}></div>
                 {/* The Labels below */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                     <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>n=0</span>
                     <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>now</span>
                 </div>
             </div>
        );
    };

    return (
        <div style={{ marginTop: "1rem" }} id={props.id} data-widget-id={props.id}>
            <style>{`
                .p-dropdown-item {
                    padding: 0 !important;
                }
                .p-dropdown-item > span {
                    flex-grow: 1;
                }
            `}</style>
            <Dropdown_
                ref={dropdownRef}
                id={props.id}
                data-widget-id={props.id}
                options={props.options}
                value={value}
                onChange={(e) => onChange(e.value)}
                placeholder={props.placeholder || "Select"}
                style={{ width: "100%" }}
                itemTemplate={itemTemplate}
                panelFooterTemplate={panelFooterTemplate}
            />
        </div>
    );
};

export default SingleSelectDropdown;
