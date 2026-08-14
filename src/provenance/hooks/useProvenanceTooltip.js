import { useContext } from 'react';
import ProvenanceContext from "../ProvenanceContext.js";

const useProvenanceTooltip = () => {
    const context = useContext(ProvenanceContext);
    return context.tooltip ?? context.tooltipId;
};

export default useProvenanceTooltip;
