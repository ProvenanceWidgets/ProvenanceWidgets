import { useEffect, useState } from 'react';
import {
    SuperProvenance as SuperProvenance_,
    PROVENANCE_INSERT_EVENT,
} from '@provenance-widgets/core';
import useProvenance from '../provenance/hooks/useProvenance.js';
import useWidgetRegistry from '../provenance/hooks/useWidgetRegistry.js';
import SuperProvenanceButton from '../shared/components/SuperProvenanceButton.js';
import AggregateView from './AggregateView.js';

const SuperProvenance = (props) => {
    const [, setRegisteredComponents] = useProvenance()
    const { registrations } = useWidgetRegistry();
    const [superProvenance] = useState(() => new SuperProvenance_())

    useEffect(() => {
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, superProvenance)
            return newMap
        })

        const handleSuperChange = () => {
            setRegisteredComponents(prev => {
                if (prev instanceof Map) {
                    return new Map(prev)
                }
                return new Map()
            })
        };
        superProvenance.addEventListener(
            PROVENANCE_INSERT_EVENT,
            handleSuperChange
        )

        return () => {
            superProvenance.removeEventListener(
                PROVENANCE_INSERT_EVENT,
                handleSuperChange
            );
            Array.from(superProvenance.registeredWidgets.keys()).forEach(
                widgetId => superProvenance.unregister(widgetId)
            );
            setRegisteredComponents(prev => {
                if (
                    !(prev instanceof Map) ||
                    prev.get(props.id) !== superProvenance
                ) {
                    return prev;
                }
                const next = new Map(prev);
                next.delete(props.id);
                return next;
            });
        };
    }, [
        props.id,
        superProvenance,
        setRegisteredComponents,
    ])

    useEffect(() => {
        const componentIds = new Set(props.components ?? []);
        let changed = false;

        for (const widgetId of superProvenance.registeredWidgets.keys()) {
            const metadata = registrations.get(widgetId);
            if (!componentIds.has(widgetId) || !metadata) {
                changed = superProvenance.unregister(widgetId) || changed;
            }
        }

        componentIds.forEach(widgetId => {
            const metadata = registrations.get(widgetId);
            if (!metadata) return;

            const existing =
                superProvenance.registeredWidgets.get(widgetId);
            const needsRegistration =
                existing?.provenance !== metadata.provenance ||
                existing?.type !== metadata.type ||
                existing?.setValue !== metadata.setValue;
            if (!needsRegistration) return;

            superProvenance.register(metadata);
            changed = true;
        });

        if (changed) {
            setRegisteredComponents(prev =>
                prev instanceof Map ? new Map(prev) : new Map()
            );
        }
    }, [
        props.components,
        registrations,
        superProvenance,
        setRegisteredComponents,
    ])

    return (
        <div>
            {props.default && <div style={{ display: "flex", gap: 10, position: "relative" }}>
                <SuperProvenanceButton prov={superProvenance} />
                <AggregateView target={props.id} />
            </div>}
            {props.children}
        </div>
    )
}

export default SuperProvenance
