import { PROVENANCE_INSERT_EVENT } from "@provenance-widgets/core";
import { useEffect, useReducer } from "react";

export default function useProvenanceUpdates(provenance) {
    const [, rerender] = useReducer(version => version + 1, 0);

    useEffect(() => {
        if (!provenance) return;
        provenance.addEventListener(PROVENANCE_INSERT_EVENT, rerender);
        return () =>
            provenance.removeEventListener(PROVENANCE_INSERT_EVENT, rerender);
    }, [provenance]);
}
