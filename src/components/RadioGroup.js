import { useEffect, createContext, useContext, useRef, useCallback } from 'react';
import SelectionProvenance from '../strategies/provenance/SelectionProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import useRevertedValue from './hooks/useRevertedValue.js';

// Create context for radio group
const RadioGroupContext = createContext(null);

// Export hook to use the context
export const useRadioGroup = () => {
    return useContext(RadioGroupContext);
};

const RadioGroup = (props) => {
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const selectionProvenanceRef = useRef(null);
    const previousSelectedValueRef = useRef(null);
    const [revertedValue] = useRevertedValue(props.id);
    const isInitialMount = useRef(true);
    const lastRevertedValueRef = useRef(undefined);

    //     useEffect(() => {
    //         // Only log if revertedValue actually changed AND it's not the initial mount
    //         // This prevents duplicate logging during normal user interactions
    //         if (revertedValue !== undefined &&
    //             revertedValue !== lastRevertedValueRef.current &&
    //             !isInitialMount.current) {
    //             if (selectionProvenanceRef.current) {
    //                 const selectedValues = revertedValue ? [revertedValue] : [];
    //                 selectionProvenanceRef.current.insert(selectedValues);
    //                 previousSelectedValueRef.current = selectedValues;
    //                 lastRevertedValueRef.current = revertedValue;
    //             }
    //         }
    //         if (isInitialMount.current) {
    //             isInitialMount.current = false;
    //         }
    //     }, [revertedValue]);

    useEffect(() => {
        const selectionProvenance = new SelectionProvenance();
        selectionProvenance.tooltipLabel = props['data-label'] || props.id;
        selectionProvenanceRef.current = selectionProvenance;

        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, selectionProvenance)
            return newMap
        })

        selectionProvenance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
            console.log(v.detail)
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

    // Use ref to track registered radio button values
    const registeredRadiosRef = useRef(new Set());

    const registerRadio = useCallback((value) => {
        registeredRadiosRef.current.add(value);
    }, []);

    const updateRadioState = useCallback((selectedValue) => {
        // Trigger insert only if selectionProvenance is ready
        if (selectionProvenanceRef.current) {
            // For radio buttons, only one can be selected at a time
            // The selectedValue is the value of the currently selected radio button (or null/undefined if none)
            const selectedValues = selectedValue ? [selectedValue].sort() : [];

            // Only insert if the selected values actually changed
            // Skip if this is the initial empty state (no previous value and current is empty)
            const previousValues = previousSelectedValueRef.current;
            const isInitialEmptyState = !previousValues && selectedValues.length === 0;

            if (!isInitialEmptyState) {
                previousSelectedValueRef.current = selectedValues;
                selectionProvenanceRef.current.insert(selectedValues, { caller: selectedValue });
            } else {
                // Set the initial state reference
                previousSelectedValueRef.current = selectedValues;
            }
        }
    }, []);

    return (
        <RadioGroupContext.Provider value={{
            registerRadio,
            updateRadioState,
            guidance: selectionProvenanceRef.current,
            id: props.id,
            tooltipLabel: props['data-label'] || props.id,
        }}>
            {props.children}
        </RadioGroupContext.Provider>
    )
}

export default RadioGroup
