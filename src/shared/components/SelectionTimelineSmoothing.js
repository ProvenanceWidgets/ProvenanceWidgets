import { useId } from "react";
import { color } from "d3";
import { buildSelectionSmoothingBoundaries } from "../logic/selectionSmoothingBoundaries.js";

/** Straight solid blocks, with blur confined to patches at different-color edges. */
export default function SelectionTimelineSmoothing({ bars, boundaryRadius = 1.2, wholeBar = false, blurRadius = 1.2 }) {
    const id = useId().replace(/:/g, "");
    if (wholeBar) {
        const radius = Number.isFinite(blurRadius) ? Math.max(0, blurRadius) : 1.2;
        const filterId = `selection-bar-${id}`;
        return (
            <svg data-provenance-selection-smoothing="whole-bar" width="100%" height="24"
                viewBox="0 0 100 24" preserveAspectRatio="none" overflow="hidden"
                aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <defs>
                    <filter id={filterId} x="-100%" y="0%" width="300%" height="100%"
                        colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation={`${radius} 0`} />
                    </filter>
                </defs>
                <rect width="100" height="24" fill="#fff" />
                <g filter={radius > 0 ? `url(#${filterId})` : undefined}>
                    {bars.map(bar => (
                        <rect key={bar.key} x={parseFloat(bar.left)}
                            width={parseFloat(bar.width)} height="24" fill={bar.color}
                            stroke={color(bar.color)?.darker().formatHex()} strokeWidth="1"
                            vectorEffect="non-scaling-stroke" />
                    ))}
                </g>
            </svg>
        );
    }
    const boundaries = buildSelectionSmoothingBoundaries(bars, boundaryRadius);
    return (
        <svg data-provenance-selection-smoothing="true" width="100%" height="24"
            aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <rect width="100%" height="24" fill="#fff" />
            {bars.map(bar => (
                <rect key={bar.key} x={bar.left}
                    width={parseFloat(bar.width) === 0 ? 1 : bar.width}
                    height="24" fill={bar.color}
                    stroke={color(bar.color)?.darker().formatHex()} strokeWidth="1" />
            ))}
            {boundaries.map((boundary, index) => {
                const filterId = `selection-edge-${id}-${index}`;
                return (
                    <svg key={boundary.position}
                        data-provenance-smoothed-boundary={boundary.position}
                        x={`${boundary.left}%`} width={`${boundary.width}%`} height="24"
                        viewBox="0 0 2 24" preserveAspectRatio="none" overflow="hidden">
                        <defs>
                            <filter id={filterId} x="0" y="0" width="2" height="24"
                                filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                <feGaussianBlur stdDeviation="0.3 0" />
                            </filter>
                        </defs>
                        <g filter={`url(#${filterId})`}>
                            <rect x="-2" width="3" height="24" fill={boundary.leftColor} />
                            <rect x="1" width="3" height="24" fill={boundary.rightColor} />
                        </g>
                    </svg>
                );
            })}
        </svg>
    );
}
