import { useContext } from "react";
import ProvenanceContext from "../ProvenanceContext.js";

const useWidgetRegistry = () => {
    const context = useContext(ProvenanceContext);
    return {
        registrations: context.state.widgetRegistrations,
        registerWidget: context.actions.registerWidget,
        unregisterWidget: context.actions.unregisterWidget,
        notifyWidget: context.actions.notifyWidget,
        getWidgetRegistration: context.actions.getWidgetRegistration,
        restoreWidgetValue: context.actions.restoreWidgetValue,
        focusWidget: context.actions.focusWidget,
    };
};

export default useWidgetRegistry;
