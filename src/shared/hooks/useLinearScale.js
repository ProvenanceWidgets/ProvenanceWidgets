import { scaleLinear } from "d3";
import { useMemo } from "react";

export default function useLinearScale(domain, provenance, extrema) {
    const domainArray = provenance?.domain?.get(domain);
    const scale = useMemo(
        () => {
            if (!provenance) return scaleLinear();
            return scaleLinear(
                domainArray,
                typeof extrema === "number" ? [0, extrema] : extrema
            );
        },
        [domain, provenance, domainArray, extrema]
    );

    return scale;
}
