import { curveMonotoneY, line } from "d3";

const toSvgId = value => Array.from(String(value)).map(character =>
    /[a-zA-Z0-9_-]/.test(character)
        ? character
        : `_${character.codePointAt(0).toString(16)}_`
).join("");

/** Display-only temporal trajectories; history restore remains unavailable while active. */
const SliderTemporalSmoothingCurve = ({
    samples = [],
    method = "savgol",
    min,
    max,
    width,
    height,
    range = false,
    recencyStops = [],
    gradientKey,
}) => {
    if (samples.length < 2 || !(max > min) || !(width > 0) || !(height > 0)) {
        return null;
    }
    const x = value => ((value - min) / (max - min)) * width;
    const y = sample => 8 + (sample.offset * Math.max(0, height - 16));
    const pathFor = field => line()
        .x(sample => x(sample[field]))
        .y(y)
        .curve(curveMonotoneY)(samples);
    const stops = recencyStops
        .filter(stop => Number.isFinite(stop?.offset) && typeof stop?.color === "string")
        .map(stop => ({ offset: Math.min(1, Math.max(0, stop.offset)), color: stop.color }))
        .sort((a, b) => a.offset - b.offset);
    const gradientId = `slider-temporal-smoothing-gradient-${toSvgId(
        gradientKey ?? `${method}-${min}-${max}`
    )}`;
    const fields = range ? ["low", "high"] : ["value"];
    const clipId = `${gradientId}-best-fit-clip`;
    const bestFitFor = field => {
        const points = samples.filter(sample =>
            Number.isFinite(sample.offset) && Number.isFinite(sample[field]));
        if (points.length < 2) return null;
        const meanOffset = points.reduce((sum, sample) => sum + sample.offset, 0) / points.length;
        const meanValue = points.reduce((sum, sample) => sum + sample[field], 0) / points.length;
        const variance = points.reduce((sum, sample) => sum + (sample.offset - meanOffset) ** 2, 0);
        if (!(variance > 0)) return null;
        const slope = points.reduce((sum, sample) =>
            sum + (sample.offset - meanOffset) * (sample[field] - meanValue), 0) / variance;
        const start = Math.min(...points.map(sample => sample.offset));
        const end = Math.max(...points.map(sample => sample.offset));
        return {
            x1: x(meanValue + slope * (start - meanOffset)),
            y1: y({ offset: start }),
            x2: x(meanValue + slope * (end - meanOffset)),
            y2: y({ offset: end }),
        };
    };

    return (
        <g
            data-provenance-temporal-smoothing={method}
            pointerEvents="none"
            aria-hidden="true"
        >
            <defs>
                <clipPath id={clipId}>
                    <rect x={0} y={8} width={width} height={Math.max(0, height - 16)} />
                </clipPath>
            </defs>
            {stops.length > 0 && (
                <defs>
                    <linearGradient
                        id={gradientId}
                        data-provenance-temporal-smoothing-gradient={method}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        x2={0}
                        y1={8}
                        y2={Math.max(8, height - 8)}
                    >
                        {stops.map((stop, index) => (
                            <stop
                                key={`${stop.offset}-${index}`}
                                offset={`${stop.offset * 100}%`}
                                stopColor={stop.color}
                            />
                        ))}
                    </linearGradient>
                </defs>
            )}
            {fields.map(field => (
                <path
                    key={field}
                    data-provenance-temporal-smoothing-path={field}
                    d={pathFor(field)}
                    fill="none"
                    stroke={stops.length > 0 ? `url(#${gradientId})` : "#495057"}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {fields.map(field => {
                const bestFit = bestFitFor(field);
                return bestFit && (
                    <line
                        key={`best-fit-${field}`}
                        data-provenance-temporal-best-fit={field}
                        {...bestFit}
                        clipPath={`url(#${clipId})`}
                        stroke="#334155"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        vectorEffect="non-scaling-stroke"
                    />
                );
            })}
        </g>
    );
};

export default SliderTemporalSmoothingCurve;
