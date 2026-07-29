import { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import SelectionProvenance from '../strategies/provenance/SelectionProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import useRevertedValue from './hooks/useRevertedValue.js';

// Create context for checkbox group
const CheckboxGroupContext = createContext(null);

// Export hook to use the context
export const useCheckboxGroup = () => {
    return useContext(CheckboxGroupContext);
};

const CheckboxGroup = (props) => {
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const selectionProvenanceRef = useRef(null);
    const previousSelectedValuesRef = useRef(null);
    const [revertedValue] = useRevertedValue(props.id);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (revertedValue !== undefined && Array.isArray(revertedValue)) {
            // Update the internal state ref if needed, but the important part is 
            // telling the children to update and logging the interaction.
            if (selectionProvenanceRef.current) {
                selectionProvenanceRef.current.insert(revertedValue);
                previousSelectedValuesRef.current = revertedValue;

                // Synchronize internal checkbox states
                revertedValue.forEach(label => checkboxStatesRef.current.set(label, true));
                // Clear those not in revertedValue
                Array.from(checkboxStatesRef.current.keys()).forEach(label => {
                    if (!revertedValue.includes(label)) checkboxStatesRef.current.set(label, false);
                });
            }
        }
    }, [revertedValue]);

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

    // Use ref to track checkbox states to avoid unnecessary re-renders
    const checkboxStatesRef = useRef(new Map());

    const registerCheckbox = useCallback((label) => {
        if (!checkboxStatesRef.current.has(label)) {
            checkboxStatesRef.current.set(label, false);
        }
    }, []);

    const updateCheckboxState = useCallback((label, checked) => {
        const currentState = checkboxStatesRef.current.get(label);
        // Only update if the value actually changed
        if (currentState !== checked) {
            checkboxStatesRef.current.set(label, checked);

            // Trigger insert only if selectionProvenance is ready
            if (selectionProvenanceRef.current) {
                // Collect all currently checked checkbox values
                const selectedValues = Array.from(checkboxStatesRef.current.entries())
                    .filter(([l, c]) => c)
                    .map(([l]) => l)
                    .sort();

                // Only insert if the selected values actually changed
                // Skip if this is the initial empty state (no previous values and current is empty)
                const previousValues = previousSelectedValuesRef.current;
                const isInitialEmptyState = !previousValues && selectedValues.length === 0;

                if (!isInitialEmptyState) {
                    const valuesChanged = !previousValues ||
                        previousValues.length !== selectedValues.length ||
                        !previousValues.every((val, idx) => val === selectedValues[idx]);

                    if (valuesChanged) {
                        previousSelectedValuesRef.current = selectedValues;
                        selectionProvenanceRef.current.insert(selectedValues, { caller: label });
                    }
                } else {
                    // Set the initial state reference
                    previousSelectedValuesRef.current = selectedValues;
                }
            }
        }
    }, []);

    return (
        <CheckboxGroupContext.Provider value={{
            registerCheckbox,
            updateCheckboxState,
            guidance: selectionProvenanceRef.current,
            id: props.id,
            tooltipLabel: props['data-label'] || props.id,
        }}>
            {props.children}
        </CheckboxGroupContext.Provider>
    )
}

export default CheckboxGroup
