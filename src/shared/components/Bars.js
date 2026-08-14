import { scaleBand } from "d3";
import useLinearScale from "../hooks/useLinearScale.js";
import useProvenanceUpdates from "../../provenance/hooks/useProvenanceUpdates.js";
import { normalize } from "../logic/valueMath.js";
import {
    getMostRecentScentKey,
    getRangeScentIntervals,
    getVisibleScentKeys,
} from "../logic/scentBarsData.js";

const toDimension = orientation => (
    orientation === "horizontal" ? "width" : "height"
);

const antiDimension = dimension => (
    dimension === "width" ? "height" : "width"
);

const RangeIntervalBars = props => {
    const {
        provenance,
        barKeys,
        rangeInterval,
        width,
        height,
        orientationScheme,
        encodings: { colorDomain },
    } = props;
    const min = barKeys[0];
    const max = barKeys.length > 1
        ? barKeys[barKeys.length - 1]
        : min;
    const intervals = getRangeScentIntervals({
        provenance,
        rangeInterval,
        min,
        max,
        width,
    });

    if (intervals.length === 0) return null;

    const maxHeight = height * 0.8;
    const minHeight = height * 0.2;
    const widths = intervals.map(interval => interval.width);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    const heightFor = intervalWidth => (
        Math.abs(maxWidth - minWidth) < 0.1
            ? maxHeight
            : maxHeight -
                ((intervalWidth - minWidth) / (maxWidth - minWidth)) *
                    (maxHeight - minHeight)
    );
    const indexDomain = provenance?.domain?.get?.(colorDomain) ?? [0, 1];
    const recentIndex = Math.max(...intervals.map(interval => interval.index));

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            aria-hidden="true"
        >
            {[...intervals]
                .sort((left, right) => {
                    if (left.index === recentIndex) return 1;
                    if (right.index === recentIndex) return -1;
                    return right.width - left.width;
                })
                .map(interval => {
                    const barHeight = heightFor(interval.width);
                    const recent = interval.index === recentIndex;
                    return (
                        <rect
                            key={`${interval.index}-${interval.low}-${interval.high}`}
                            x={interval.x}
                            y={height - barHeight}
                            width={interval.width}
                            height={barHeight}
                            fill={orientationScheme(
                                normalize(interval.index, indexDomain)
                            )}
                            stroke={recent ? "#000" : "none"}
                            strokeWidth={recent ? 2 : 0}
                        />
                    );
                })}
        </svg>
    );
};

export default function Bars(props) {
    const {
        provenance,
        orientationScheme,
        encodings: {
            orientation,
            positionDomain,
            colorDomain,
        },
    } = props;
    useProvenanceUpdates(provenance);

    const primaryDimension = toDimension(orientation);
    const secondaryDimension = antiDimension(primaryDimension);
    const primaryExtrema = props[primaryDimension];
    const secondaryExtrema = props[secondaryDimension];
    const scale = useLinearScale(
        positionDomain,
        provenance,
        [0, primaryExtrema]
    );

    if (props.layout === "range-interval") {
        return <RangeIntervalBars {...props} />;
    }

    const visibleKeys = getVisibleScentKeys(provenance, props.barKeys);
    const band = scaleBand()
        .domain(props.barKeys)
        .range([0, secondaryExtrema]);
    const sliderDomainStart = Number(props.barKeys[0]);
    const sliderDomainEnd = Number(
        props.barKeys[props.barKeys.length - 1]
    );
    const sliderBarWidth = Math.max(1, props.barWidth ?? 8);
    const getSliderX = value => {
        const numericValue = Number(value);
        if (
            !Number.isFinite(numericValue) ||
            !Number.isFinite(sliderDomainStart) ||
            !Number.isFinite(sliderDomainEnd) ||
            sliderDomainEnd === sliderDomainStart
        ) {
            return (secondaryExtrema - sliderBarWidth) / 2;
        }
        const center = (
            (numericValue - sliderDomainStart) /
            (sliderDomainEnd - sliderDomainStart)
        ) * secondaryExtrema;
        return center - sliderBarWidth / 2;
    };
    const recentKey = props.layout === "slider"
        ? getMostRecentScentKey(
            provenance,
            visibleKeys,
            colorDomain
        )
        : null;

    return (
        <svg
            viewBox={`0 0 ${props.width} ${props.height}`}
            width={props.width}
            height={props.height}
            style={
                props.layout === "slider"
                    ? { overflow: "visible" }
                    : undefined
            }
            aria-hidden="true"
        >
            {visibleKeys.map(value => {
                const record = provenance.aggregateData?.get(value);
                const sliderLayout =
                    props.layout === "slider" &&
                    orientation === "vertical";
                const position = record?.[positionDomain];
                const scaledPosition = scale(position);

                return (
                    <rect
                        key={value}
                        fill={orientationScheme(
                            normalize(
                                record?.[colorDomain],
                                provenance.domain?.get(colorDomain)
                            )
                        )}
                        stroke={value === recentKey ? "#000" : "none"}
                        strokeWidth={value === recentKey ? 2 : 0}
                        {...(
                            orientation === "horizontal"
                                ? {
                                    x: scale(0),
                                    y: band(value),
                                    width: scaledPosition,
                                    height: band.bandwidth(),
                                }
                                : {
                                    x: sliderLayout
                                        ? getSliderX(value)
                                        : band(value),
                                    y: scale(0) +
                                        (props.height - scaledPosition),
                                    width: sliderLayout
                                        ? sliderBarWidth
                                        : band.bandwidth(),
                                    height: scaledPosition,
                                }
                        )}
                    />
                );
            })}
        </svg>
    );
}
