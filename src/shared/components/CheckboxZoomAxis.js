import { useLayoutEffect, useRef, useState } from "react";
import ZoomedRangeAxis from "./ZoomedRangeAxis.js";

/** Align the selected-domain axis with the actual checkbox history tracks. */
export default function CheckboxZoomAxis({ id, elementRef, domain, mode, panel = false }) {
    const footerRef = useRef(null);
    const [layout, setLayout] = useState({ left: 0, width: 0, guideHeight: 0 });
    useLayoutEffect(() => {
        const group = panel
            ? footerRef.current?.closest(".p-dropdown-panel, .p-multiselect-panel")
            : elementRef.current;
        const footer = footerRef.current;
        if (!group || !footer) return undefined;
        const measure = () => {
            const track = [...group.querySelectorAll("[data-provenance-selection-track], [data-provenance-checkbox-track]")]
                .find(element => panel || (element.getAttribute("data-provenance-selection-track") ?? element.getAttribute("data-provenance-checkbox-track")) === id);
            if (!track) {
                setLayout({ left: 0, width: 0, guideHeight: 0 });
                return;
            }
            const bounds = track.getBoundingClientRect();
            const footerBounds = footer.getBoundingClientRect();
            const left = bounds.left - footerBounds.left;
            const scrollContainer = track.closest(".p-dropdown-items-wrapper, .p-multiselect-items-wrapper");
            const visibleTop = Math.max(bounds.top, scrollContainer?.getBoundingClientRect().top ?? bounds.top);
            const guideHeight = Math.max(0, footerBounds.top - visibleTop);
            setLayout(previous => previous.left === left && previous.width === bounds.width && previous.guideHeight === guideHeight
                ? previous : { left, width: bounds.width, guideHeight });
        };
        measure();
        group.addEventListener("scroll", measure, true);
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
        observer?.observe(group);
        group.querySelectorAll("[data-provenance-selection-track], [data-provenance-checkbox-track]").forEach(track => observer?.observe(track));
        return () => {
            observer?.disconnect();
            group.removeEventListener("scroll", measure, true);
        };
    }, [elementRef, id, panel, domain]);

    return (
        <div ref={footerRef} data-provenance-zoom-footer={id}
            style={{ position: "relative", height: 36, marginTop: 6 }}>
            {domain && layout.width > 0 && (
                <div style={{ position: "absolute", left: layout.left, width: layout.width }}>
                    <ZoomedRangeAxis
                        domain={domain}
                        orientation="horizontal"
                        axisKind="interactions"
                        integerTicks={mode !== "time"}
                        pixelLength={layout.width}
                        guideHeight={layout.guideHeight}
                        minTickSpacing={mode === "time" ? 48 : Math.max(24, String(Math.floor(domain[1])).length * 7 + 10)}
                        horizontalInset={0}
                        rightInset={0}
                        step={mode === "time" ? Math.max((domain[1] - domain[0]) / 6, 0.001) : 1}
                        theme="light"
                        label={mode === "time" ? "Selected time range" : "Selected interaction range"}
                        formatTick={value => `${Number(Number(value).toFixed(2))}${mode === "time" ? "s" : ""}`}
                    />
                </div>
            )}
        </div>
    );
}
