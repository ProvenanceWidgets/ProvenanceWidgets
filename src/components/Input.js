import { InputText as InputText_ } from 'primereact/inputtext/inputtext.esm.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import useProvenance from './hooks/useProvenance.js';
import TextProvenance from '../strategies/provenance/TextProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import { interpolateOranges } from 'd3';
import { getScentColor } from './utils.js';
import useRevertedValue from './hooks/useRevertedValue.js';
import Chart from './Chart.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import { formatAggregateTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';

const InputText = (props) => {
    const { placeholder, id } = props;
    const [text, setText] = useState('');
    const [revertedValue] = useRevertedValue(id);
    const [textProvenance, setTextProvenance] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const tooltip = useProvenanceTooltip();
    const tooltipLabel = props['data-label'] || id;

    useEffect(() => {
        if (revertedValue !== undefined && revertedValue !== null) {
            setText(String(revertedValue));
            if (textProvenance) {
                textProvenance.insert(String(revertedValue));
            }
        }
    }, [revertedValue, textProvenance]);

    const [registeredComponents, setRegisteredComponents] = useProvenance();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const inputRef = useRef(null);

    // Listen for provenance-dropdown-toggle for this input
    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === id) {
                setDropdownVisible(e.detail.open);
                if (e.detail.open) setShowSuggestions(false);
            }
        };
        window.addEventListener('provenance-dropdown-toggle', handleToggle);
        return () => window.removeEventListener('provenance-dropdown-toggle', handleToggle);
    }, [id]);

    useEffect(() => {
        const newTextProvenance = new TextProvenance();
        newTextProvenance.tooltipLabel = tooltipLabel;
        newTextProvenance.tooltipIndexOffset = 1;
        setTextProvenance(newTextProvenance);
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map();
            newMap.set(id, newTextProvenance);
            return newMap;
        });

        const handleGuidance = () => {
            setRegisteredComponents(prev => (prev instanceof Map ? new Map(prev) : new Map()));
        };
        newTextProvenance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, handleGuidance);

        return () => {
            newTextProvenance.removeEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, handleGuidance);
        };
    }, [id, setRegisteredComponents, tooltipLabel]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setText(value);
        // We usually don't open dropdown on type for provenance view, 
        // unless it's a search dropdown. 
        // But the user requested "Temporal view for input text will be similar to single select...".
        // This implies the view is triggered by the ProvenanceButton, which sets isDropdownVisible via event.
        // So we might NOT want to auto-open here.
        // However, standard behavior might be to track history on change/enter.
        // Let's keep existing logic but ensure the provenance view uses Chart.
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const trimmed = text.trim();
            if (!trimmed || !textProvenance) return;
            textProvenance.insert(trimmed);
            setShowSuggestions(true);
            // setDropdownVisible(false); // Don't auto-close if we are viewing history
        }
    };

    const suggestions = useMemo(() => {
        if (!textProvenance?.aggregateData) return [];

        const query = text.trim().toLocaleLowerCase();
        const entries = [...textProvenance.aggregateData.entries()]
            .filter(([value]) => !query || String(value).toLocaleLowerCase().includes(query))
            .sort(([, a], [, b]) => (
                new Date(b.time).getTime() - new Date(a.time).getTime()
            ));
        const maxCount = Math.max(1, ...entries.map(([, record]) => record.count ?? 0));

        return entries.map(([value, record]) => ({
            value,
            record,
            width: `${((record.count ?? 0) / maxCount) * 100}%`,
            color: getScentColor(value, textProvenance, interpolateOranges) || '#f4bd88',
        }));
    }, [textProvenance, text, registeredComponents]);

    const selectSuggestion = (value) => {
        const selectedValue = String(value);
        setText(selectedValue);
        textProvenance?.insert(selectedValue);
        setShowSuggestions(false);
        tooltip?.hide?.();
    };

    return (
        <div
            style={{ marginTop: "1rem", position: 'relative' }}
            ref={inputRef}
            onBlur={(event) => {
                if (event.currentTarget.contains(event.relatedTarget)) return;
                setShowSuggestions(false);
                tooltip?.hide?.();
            }}
        >
            <InputText_
                id={id}
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
                value={text}
                style={{ width: '100%' }}
            />
            {!isDropdownVisible && showSuggestions && suggestions.length > 0 && (
                <div
                    role="listbox"
                    aria-label={`${tooltipLabel} search history`}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        zIndex: 1000,
                        marginTop: '2px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden',
                    }}
                >
                    {suggestions.map(({ value, record, width, color }) => {
                        const tooltipProps = getTooltipAnchorProps(
                            tooltip,
                            formatAggregateTooltip({
                                label: tooltipLabel,
                                value,
                                record,
                                kind: 'input',
                            })
                        );

                        return (
                            <div
                                key={value}
                                {...tooltipProps}
                                role="option"
                                aria-selected={text === value}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    selectSuggestion(value);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    selectSuggestion(value);
                                }}
                                style={{
                                    ...tooltipProps.style,
                                    position: 'relative',
                                    minHeight: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    overflow: 'hidden',
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        inset: '0 auto 0 0',
                                        width,
                                        backgroundColor: color,
                                        border: '1px solid rgba(0, 0, 0, 0.35)',
                                        pointerEvents: 'none',
                                    }}
                                />
                                <span style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                                    {value === '' ? '<empty>' : String(value)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
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
                   <Chart target={id} theme="light" />
                </div>
            )}
        </div>
    );
};

export default InputText;
