import { Slider as Slider_ } from 'primereact/slider/slider.esm.js';
import { useEffect, useRef, useState } from 'react';
import SuperProvenance_ from '../strategies/provenance/SuperProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import { transform } from './utils.js';
import Internal_ProvenanceButton from './Internal_ProvenanceButton.js';
import AggregateView from './AggregateView.js';

const SuperProvenance = (props) => {
    const [value, setValue] = useState()
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [superProvenance, setSuperProvenance] = useState(null)
    const [curr, setCurr] = useState()
    const lastInsertedRef = useRef(null)
    const registeredWidgetsRef = useRef(new Set())

    useEffect(() => {
        const superProv = new SuperProvenance_()

        setSuperProvenance(superProv)
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, superProv)
            return newMap
        })

        superProv.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
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

    useEffect(() => {
        if (registeredComponents.size != 0 && superProvenance) {
            let registeredNew = false;
            props.components.forEach(c => {
                // Only register if component exists and hasn't been registered yet
                if (registeredComponents.has(c) && !registeredWidgetsRef.current.has(c)) {
                    superProvenance.register(c, registeredComponents.get(c))
                    registeredWidgetsRef.current.add(c);
                    registeredNew = true;
                }
            })
            // Only trigger re-render when NEW widgets are registered
            if (registeredNew) {
                setRegisteredComponents(prev => {
                    if (prev instanceof Map) {
                        return new Map(prev)
                    }
                    return new Map()
                })
            }
        }
    }, [registeredComponents, superProvenance])

    return (
        <div>
            {props.default && <div style={{ display: "flex", gap: 10, position: "relative" }}>
                <Internal_ProvenanceButton prov={superProvenance} />
                <AggregateView target={props.id} />
            </div>}
            {props.children}
        </div>
    )
}

export default SuperProvenance 