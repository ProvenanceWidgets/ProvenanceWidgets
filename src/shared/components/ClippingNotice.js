import { useMemo } from "react";
import { getClippingNotice, resolveClippingNoticePeriods } from "../logic/scalability/index.js";

/** A widget-local notice; synchronized views produce one announcement. */
export default function ClippingNotice({ id, records, scalability, width, mode }) {
    const periods = useMemo(() => resolveClippingNoticePeriods({
        records, scalability, width, mode,
    }), [records, scalability, width, mode]);
    const message = getClippingNotice(periods);
    if (!message) return null;
    return (
        <div style={{ position: "relative", height: 0, zIndex: 1001 }}>
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-provenance-clipping-notice={id}
                style={{
                    position: "absolute", right: 0, bottom: 4,
                    padding: "4px 8px", borderRadius: 4,
                    background: "#e6f4fa", color: "#155e75",
                    fontSize: 12, whiteSpace: "nowrap", pointerEvents: "none",
                }}
            >
                {message}
            </div>
        </div>
    );
}
