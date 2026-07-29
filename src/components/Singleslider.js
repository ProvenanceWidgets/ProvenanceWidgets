import { Slider as Slider_ } from 'primereact/slider/slider.esm.js';
import { useEffect, useRef, useState } from 'react';
import NumericProvenance from '../strategies/provenance/NumericProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import { transform, generateRange } from './utils.js';
import Bars from 'scents';
import { interpolateOranges } from 'd3';
import useRevertedValue from './hooks/useRevertedValue.js';

// { id, stateItem, setStateItem, max, min = 0, step = 1 }
import useElementSize from './hooks/useElementSize.js';
import Chart from './Chart.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import { formatAggregateTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';

const Singleslider = (props) => {
    const tooltipId = useProvenanceTooltip();
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const step = props.step ?? 1;
    const initialValue = props.value ?? min;
    const tooltipLabel = props['data-label'] || props.id;
    const barKeys = generateRange(min, max + step, step);
    const [revertedValue] = useRevertedValue(props.id);
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [curr, setCurr] = useState()

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
        if (revertedValue !== undefined && curr) {
            props.onChange(revertedValue);
            curr.insert(revertedValue);
            lastInsertedRef.current = revertedValue;
        }
    }, [revertedValue, curr]);
    const lastInsertedRef = useRef(null)

    // Measure width of the container
    const [containerRef, { width: containerWidth }] = useElementSize();

    useEffect(() => {
        const sliderProvenance = new NumericProvenance(min, max);
        sliderProvenance.tooltipLabel = tooltipLabel;
        sliderProvenance.tooltipIndexOffset = 1;
        // PW 1.0 keeps the original slider value as an internal baseline, but
        // does not visualize provenance until the first real user change.
        sliderProvenance.hasUserInteracted = false;
        
        // Keep the controlled original value for later temporal/ordinal
        // context. It is hidden by hasUserInteracted until the user moves SS.
        if (props.value !== undefined && props.value !== null) {
            sliderProvenance.insert(props.value);
            lastInsertedRef.current = props.value;
        } else if (initialValue !== undefined) {
            sliderProvenance.insert(initialValue);
            lastInsertedRef.current = initialValue;
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
        if (!curr) return;
        const intVal = parseInt(val)
        if (Number.isNaN(intVal)) return

        // Skip if same as last inserted to avoid duplicate provenance entries
        if (lastInsertedRef.current === intVal) return

        curr.hasUserInteracted = true
        curr.insert(intVal)
        lastInsertedRef.current = intVal
    }

    return (
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "1rem", width: "100%", position: 'relative' }}>
            {/* Scents Bars Visualization */}
            {containerWidth > 0 && curr?.hasUserInteracted &&
                <div style={{ position: 'relative', width: containerWidth, height: 50 }}>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        <Bars
                            guidance={curr}
                            orientationScheme={interpolateOranges}
                            barKeys={barKeys}
                            encodings={{
                                orientation: "vertical",
                                positionDomain: "count",
                                colorDomain: "index",
                            }}
                            width={containerWidth}
                            height={50}
                            layout="slider"
                            barWidthFactor={0.25}
                        />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                        {barKeys.map((key, index) => {
                            const record = curr.aggregateData?.get(key);
                            if (!record) return null;

                            const tooltipProps = getTooltipAnchorProps(
                                tooltipId,
                                formatAggregateTooltip({
                                    label: tooltipLabel,
                                    value: key,
                                    record,
                                    kind: 'slider',
                                    sequenceIndex: Math.max(0, (record.index ?? 1) - 1),
                                    sequenceTotal: Math.max(0, (curr.detailedData?.size ?? 1) - 1),
                                })
                            );

                            return (
                                <div
                                    key={key}
                                    {...tooltipProps}
                                    style={{
                                        ...tooltipProps.style,
                                        position: 'absolute',
                                        left: `${(index / barKeys.length) * 100}%`,
                                        width: `${100 / barKeys.length}%`,
                                        top: 0,
                                        bottom: 0,
                                        background: 'transparent',
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            }
            <div style={{ display: "flex", alignItems: "center", gap: "5px", width: "100%" }}>
                <Slider_ style={{ width: "100%" }} step={step} max={max} min={min} value={props.value} onChange={e => { props.onChange(e.value); onProvChange(e.value); }} />
            </div>

            {isDropdownVisible && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
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

export default Singleslider 
