import { useContext } from "react"
import ProvenanceContext from "../contexts/provenance.js"

const useWidgetColors = () => {
    return [useContext(ProvenanceContext).state.widgetColors, useContext(ProvenanceContext).actions.setWidgetColors]
}

export default useWidgetColors

