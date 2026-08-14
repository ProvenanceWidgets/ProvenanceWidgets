import { useContext } from "react"
import ProvenanceContext from "../ProvenanceContext.js"

const useProvenance = () => {
    const context = useContext(ProvenanceContext);
    return [
        context.state.registeredComponents,
        context.actions.setRegisteredComponents,
    ];
}

export default useProvenance
