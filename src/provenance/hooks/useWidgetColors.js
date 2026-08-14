import { useContext } from "react"
import ProvenanceContext from "../ProvenanceContext.js"

const useWidgetColors = () => {
    const context = useContext(ProvenanceContext);
    return [
        context.state.widgetColors,
        context.actions.setWidgetColors,
    ];
}

export default useWidgetColors
