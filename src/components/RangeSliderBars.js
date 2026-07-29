import { getRangeBarSegments, normalizeRangeBarIndex } from './rangeSliderBarData.js';

const RangeSliderBars = ({
    guidance,
    min,
    max,
    width,
    height,
    colorScheme,
    getBarProps,
}) => {
    const segments = getRangeBarSegments(guidance, min, max);
    const maxCount = Math.max(1, ...segments.map(segment => segment.count));
    const latestIndex = guidance?.domain?.get('index')?.[1] ?? 0;
    const indexDomain = guidance?.domain?.get('index') ?? [0, latestIndex];
    const maxBarHeight = height * 0.8;
    const x = value => ((value - min) / (max - min)) * width;

    return (
        <svg
            role="group"
            aria-label="Range slider provenance bars"
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}
        >
            {segments.map(segment => {
                const barHeight = (segment.count / maxCount) * maxBarHeight;
                const isLatest = segment.index === latestIndex;

                const tooltipProps = segment.time
                    ? getBarProps?.([segment.low, segment.high], segment) ?? {}
                    : {};

                return (
                    <g key={`${segment.low}-${segment.high}`}>
                        <rect
                            x={x(segment.low)}
                            y={height - barHeight}
                            width={x(segment.high) - x(segment.low)}
                            height={barHeight}
                            fill={colorScheme(normalizeRangeBarIndex(segment.index, indexDomain))}
                            stroke={isLatest ? '#000' : 'none'}
                            strokeWidth={isLatest ? 2 : 0}
                            vectorEffect="non-scaling-stroke"
                            pointerEvents="none"
                        />
                        {segment.time && (
                            <rect
                                {...tooltipProps}
                                x={x(segment.low)}
                                y={0}
                                width={x(segment.high) - x(segment.low)}
                                height={height}
                                fill="transparent"
                                stroke="none"
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default RangeSliderBars;
