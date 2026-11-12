import { useMemo } from "react";
import { resolveActiveClippingBadge } from "../logic/scalability/strategies/clipping/clippingNotice.js";

export default function useClippingBadge({ records, scalability, width, mode, showTimeline }) {
    return useMemo(() => resolveActiveClippingBadge({ records, scalability, width, mode, showTimeline }),
        [records, scalability, width, mode, showTimeline]);
}
