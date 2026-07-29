import { createContext } from 'react';

const ProvenanceContext = createContext({
    tooltipId: null,
    tooltip: null,
    state: {
        registeredComponents: new Map(),
        widgetColors: {},
        revertedValues: {}
    },
    actions: {
        setRegisteredComponents: () => { },
        setWidgetColors: () => { },
        setRevertedValues: () => { }
    }
});

export default ProvenanceContext;
