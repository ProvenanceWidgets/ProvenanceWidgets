import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../../constants.ts';
import { useEffect, useState } from "react";

export default function useGuidanceSymbol(guidance) {
    const [symbol, setSymbol] = useState(Symbol("Guidance Symbol"));

    const updateSymbol = () => setSymbol(Symbol("Guidance Symbol"));

    useEffect(() => {
        if (!guidance) return;
        guidance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, updateSymbol);
        return () =>
            guidance.removeEventListener(
                UNILATERAL_GUIDANCE_EVENT_NAME,
                updateSymbol
            );
    }, [guidance]);

    return symbol;
}
