import { scaleLinear } from "d3";
import { useMemo } from "react";

export default function useLinearScale(domain, guidance, extrema) {
    const domainArray = guidance?.domain?.get(domain);
    const scale = useMemo(
        () => {
            if (!guidance) return scaleLinear();
            return scaleLinear(
                domainArray,
                typeof extrema === "number" ? [0, extrema] : extrema
            );
        },
        [domain, guidance, domainArray, extrema]
    );

    return scale;
}
