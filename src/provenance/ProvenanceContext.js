import { createContext } from "react";

const ProvenanceContext = createContext({
    tooltipId: null,
    tooltip: null,
    state: {
        registeredComponents: new Map(),
        widgetRegistrations: new Map(),
        widgetColors: {},
        revertedValues: {}
    },
    actions: {
        setRegisteredComponents: () => { },
        registerWidget: () => () => { },
        unregisterWidget: () => { },
        notifyWidget: () => { },
        getWidgetRegistration: () => undefined,
        restoreWidgetValue: () => false,
        focusWidget: () => false,
        setWidgetColors: () => { },
        setRevertedValues: () => { }
    }
});

export default ProvenanceContext;
