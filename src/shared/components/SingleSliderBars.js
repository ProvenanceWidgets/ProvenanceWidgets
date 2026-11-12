import { getSingleSliderBarGeometry } from "../logic/singleSliderBarGeometry.js";
import { normalize } from "../logic/valueMath.js";
import SliderSmoothingCurve from "./SliderSmoothingCurve.js";

const SingleSliderBars = ({
    provenance,
    barKeys,
    min,
    max,
    width,
    height,
    orientationScheme,
    barWidth,
    smoothingSamples,
    smoothingMethod,
    smoothingGradientKey,
}) => {
    const smoothingActive = smoothingSamples?.length > 0;
    const domainMin = Number(min);
    const domainMax = Number(max);
    const countDomain = provenance.domain?.get("count") ?? [0, 1];
    const colorDomain = provenance.domain?.get("index") ?? [0, 1];
    const countStart = Number(countDomain[0]) || 0;
    const countEnd = Number(countDomain[1]) || 0;
    const visibleKeys = barKeys.filter(key =>
        provenance.aggregateData?.has(key)
    );
    const recentKey = visibleKeys.reduce((recent, key) => {
        if (recent === null) return key;
        const keyIndex = provenance.aggregateData?.get(key)?.index ?? -Infinity;
        const recentIndex =
            provenance.aggregateData?.get(recent)?.index ?? -Infinity;
        return keyIndex > recentIndex ? key : recent;
    }, null);
    const recencyStops = visibleKeys.map(key => ({
        offset: (Number(key) - domainMin) / (domainMax - domainMin),
        color: orientationScheme(normalize(
            provenance.aggregateData.get(key)?.index,
            colorDomain
        )),
    }));

    const scaleCount = count => {
        if (countEnd <= countStart) return 0;
        return Math.max(
            0,
            ((Number(count) - countStart) / (countEnd - countStart)) * height
        );
    };

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            style={{ overflow: "visible" }}
            aria-hidden="true"
        >
            {!smoothingActive && visibleKeys.map(key => {
                const record = provenance.aggregateData.get(key);
                const barHeight = scaleCount(record?.count);
                const geometry = getSingleSliderBarGeometry({
                    value: key,
                    min: domainMin,
                    max: domainMax,
                    width,
                    barWidth,
                });
                const isRecent = key === recentKey;

                return (
                    <rect
                        key={key}
                        x={geometry.x}
                        y={height - barHeight}
                        width={geometry.width}
                        height={barHeight}
                        fill={orientationScheme(
                            normalize(record?.index, colorDomain)
                        )}
                        stroke={isRecent ? "#000" : "none"}
                        strokeWidth={isRecent ? 2 : 0}
                    />
                );
            })}
            <SliderSmoothingCurve
                samples={smoothingSamples}
                method={smoothingMethod}
                min={domainMin}
                max={domainMax}
                width={width}
                height={height}
                scaleCount={scaleCount}
                recencyStops={recencyStops}
                gradientKey={smoothingGradientKey}
            />
        </svg>
    );
};

export default SingleSliderBars;
