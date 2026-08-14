import { useContext } from "react"
import ProvenanceContext from "../ProvenanceContext.js"

const useRevertedValue = (id) => {
    const context = useContext(ProvenanceContext);
    const value = context.state.revertedValues[id];
    const setRevertedValues = context.actions.setRevertedValues;

    return [value, setRevertedValues];
}

export default useRevertedValue;
