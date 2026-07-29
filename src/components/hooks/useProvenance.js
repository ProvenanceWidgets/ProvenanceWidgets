import { useContext } from "react"
import ProvenanceContext from "../contexts/provenance.js"

const useProvenance = () => {
    return [useContext(ProvenanceContext).state.registeredComponents, useContext(ProvenanceContext).actions.setRegisteredComponents]
}

export default useProvenance