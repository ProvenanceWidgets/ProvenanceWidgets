import { area, curveMonotoneX, line } from "d3";

const toSvgId = value => Array.from(String(value)).map(character =>
    /[a-zA-Z0-9_-]/.test(character)
        ? character
        : `_${character.codePointAt(0).toString(16)}_`
).join("");

/** Display only: the curve and its recency fill never handle pointer events. */
const SliderSmoothingCurve = ({
    samples = [],
    method = "savgol",
    min,
    max,
    width,
    height,
    scaleCount,
    recencyStops = [],
    gradientKey,
}) => {
    if (samples.length < 2 || max <= min) return null;
    const x = sample => ((sample.value - min) / (max - min)) * width;
    const y = sample => Math.min(
        height,
        Math.max(0, height - scaleCount(sample.count))
    );
    const path = line()
        .x(x)
        .y(y)
        .curve(curveMonotoneX)(samples);
    const fillPath = area()
        .x(x)
        .y0(height)
        .y1(y)
        .curve(curveMonotoneX)(samples);
    const stops = recencyStops
        .filter(stop => Number.isFinite(stop?.offset) && typeof stop?.color === "string")
        .map(stop => ({
            offset: Math.min(1, Math.max(0, stop.offset)),
            color: stop.color,
        }))
        .sort((a, b) => a.offset - b.offset);
    const gradientId = `slider-smoothing-gradient-${toSvgId(
        gradientKey ?? `${method}-${min}-${max}`
    )}`;

    return (
        <>
            {stops.length > 0 && (
                <defs>
                    <linearGradient
                        id={gradientId}
                        data-provenance-smoothing-gradient={method}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        x2={width}
                        y1={0}
                        y2={0}
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
            {stops.length > 0 && (
                <path
                    data-provenance-smoothing-fill={method}
                    d={fillPath}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                    pointerEvents="none"
                    aria-hidden="true"
                />
            )}
            <path
                data-provenance-smoothing={method}
                d={path}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                aria-hidden="true"
            />
        </>
    );
};

export default SliderSmoothingCurve;
