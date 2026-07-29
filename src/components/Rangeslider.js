import { Slider as Slider_ } from 'primereact/slider/slider.esm.js';
import { useEffect, useRef, useState } from 'react';
import RangedProvenance from '../strategies/provenance/RangedProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import { interpolateOranges } from 'd3';
import useElementSize from './hooks/useElementSize.js';
import useRevertedValue from './hooks/useRevertedValue.js';
import Chart from './Chart.js';
import RangeSliderBars from './RangeSliderBars.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import { formatAggregateTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';

// { id, stateItem, setStateItem, max, min = 0, step = 1 }
const Rangeslider = (props) => {
    const tooltipId = useProvenanceTooltip();
    const [revertedValue] = useRevertedValue(props.id);
    const [, setRegisteredComponents] = useProvenance()
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [curr, setCurr] = useState()
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const tooltipLabel = props['data-label'] || props.id;

    // Listen for provenance-dropdown-toggle for this input
    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === props.id) {
                setDropdownVisible(e.detail.open);
            }
        };
        window.addEventListener('provenance-dropdown-toggle', handleToggle);
        return () => window.removeEventListener('provenance-dropdown-toggle', handleToggle);
    }, [props.id]);

    useEffect(() => {
        if (revertedValue !== undefined && Array.isArray(revertedValue) && curr) {
            props.onChange(revertedValue);
            curr.insert(revertedValue);
            lastInsertedRef.current = JSON.stringify(revertedValue);
        }
    }, [revertedValue, curr]);
    const lastInsertedRef = useRef(null)
    const [containerRef, { width: containerWidth }] = useElementSize();

    useEffect(() => {
        const sliderProvenance = new RangedProvenance(min, max);
        sliderProvenance.tooltipLabel = tooltipLabel;
        sliderProvenance.tooltipIndexOffset = 1;
        // Match PW 1.0: retain the controlled original range as a baseline,
        // but do not draw provenance or enable its footprint before a real
        // slider interaction occurs.
        sliderProvenance.hasUserInteracted = false;

        if (Array.isArray(props.value) && props.value.length === 2) {
            const initialRange = [...props.value]
                .map(Number)
                .sort((a, b) => a - b);
            if (
                initialRange.every(Number.isFinite) &&
                initialRange[0] < initialRange[1]
            ) {
                sliderProvenance.insert(initialRange);
                lastInsertedRef.current = JSON.stringify(initialRange);
            }
        }

        setCurr(sliderProvenance)
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, sliderProvenance)
            return newMap
        })

        sliderProvenance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
            // Bump reference so consumers re-render and can read updated provenance
            setRegisteredComponents(prev => {
                if (prev instanceof Map) {
                    return new Map(prev)
                }
                // Fallback: create new Map if prev is not a Map
                return new Map()
            })
        })
    }, [])

    const onProvChange = (val) => {
        if (!curr || !Array.isArray(val) || val.length !== 2) return
        const values = [...val].map(Number).sort((a, b) => a - b)
        if (!values.every(Number.isFinite) || values[0] >= values[1]) return

        const key = JSON.stringify(values)
        if (lastInsertedRef.current === key) return

        curr.hasUserInteracted = true
        curr.insert(values)
        lastInsertedRef.current = key
    }

    return (
        <div ref={containerRef} style={{ marginTop: "1rem", width: "100%", position: 'relative' }}>
            <div style={{ position: 'relative', width: '100%', height: '52px' }}>
                {containerWidth > 0 && curr?.hasUserInteracted &&
                    <div style={{ position: 'absolute', left: 0, bottom: '2px', lineHeight: 0 }}>
                        <RangeSliderBars
                            guidance={curr}
                            colorScheme={interpolateOranges}
                            min={min}
                            max={max}
                            width={containerWidth}
                            height={50}
                            getBarProps={(value, record) => getTooltipAnchorProps(
                                tooltipId,
                                formatAggregateTooltip({
                                    label: tooltipLabel,
                                    value,
                                    record,
                                    kind: 'range',
                                    sequenceIndex: Math.max(0, (record.index ?? 1) - 1),
                                    sequenceTotal: Math.max(0, (curr.detailedData?.size ?? 1) - 1),
                                })
                            )}
                        />
                    </div>
                }
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", width: "100%" }}>
                    <Slider_
                        range
                        style={{ width: "100%" }}
                        step={props.step}
                        max={max}
                        min={min}
                        value={props.value}
                        // Keep the controlled handles synchronized throughout
                        // the drag so they follow the pointer like PW 1.0.
                        onChange={e => props.onChange(e.value)}
                        // Persist one provenance interaction per completed drag,
                        // rather than recording every intermediate pixel/step.
                        onSlideEnd={e => onProvChange(e.value)}
                    />
                </div>
            </div>

            {isDropdownVisible && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff', // White background
                    zIndex: 1000,
                    borderRadius: '4px',
                    marginTop: '5px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                   <Chart target={props.id} theme="light" />
                </div>
            )}
        </div>
    )
}

export default Rangeslider 
