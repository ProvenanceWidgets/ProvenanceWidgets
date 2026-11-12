const toFiniteNumber = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const decimalPlaces = value => {
    const text = String(value).toLowerCase();
    if (text.includes("e-")) {
        return Number(text.split("e-")[1]) || 0;
    }
    return text.includes(".") ? text.split(".")[1].length : 0;
};

const uniqueSortedNumbers = values => Array.from(new Set(values))
    .sort((left, right) => left - right);

/**
 * Build the ticks used by the `options.showTicks` contract.
 * Explicit `ticksArray` values take precedence; otherwise `step` is used.
 */
export const buildSliderTicks = ({
    min,
    max,
    step = 1,
    ticksArray,
    maxTicks = 250,
}) => {
    const floor = toFiniteNumber(min);
    const ceil = toFiniteNumber(max);
    if (floor === null || ceil === null || ceil <= floor) return [];

    if (Array.isArray(ticksArray) && ticksArray.length > 0) {
        return uniqueSortedNumbers(
            ticksArray
                .map(toFiniteNumber)
                .filter(value => (
                    value !== null && value >= floor && value <= ceil
                ))
                .concat([floor, ceil])
        );
    }

    const interval = toFiniteNumber(step);
    if (interval === null || interval <= 0) return [floor, ceil];

    const precision = Math.max(
        decimalPlaces(floor),
        decimalPlaces(ceil),
        decimalPlaces(interval)
    );
    const round = value => Number(value.toFixed(precision));
    const numberOfSteps = Math.floor((ceil - floor) / interval);

    // Avoid unexpectedly creating thousands of DOM nodes when a consumer
    // enables ticks on a very large numerical domain.
    if (numberOfSteps + 2 > maxTicks) return [floor, ceil];

    const ticks = [];
    for (let index = 0; index <= numberOfSteps; index += 1) {
        ticks.push(round(floor + index * interval));
    }
    ticks.push(ceil);
    return uniqueSortedNumbers(ticks);
};

/**
 * Build a readable subset of slider ticks for an axis with a known pixel
 * length. The underlying slider step/ticksArray remains authoritative; this
 * helper only reduces density when the selected domain is too crowded.
 */
export const buildAdaptiveSliderTicks = ({
    min,
    max,
    step = 1,
    minimumStep,
    ticksArray,
    pixelLength,
    minTickSpacing = 48,
}) => {
    const floor = toFiniteNumber(min);
    const ceil = toFiniteNumber(max);
    if (floor === null || ceil === null || ceil < floor) return [];
    if (floor === ceil) return [floor];

    const availableLength = Math.max(1, Number(pixelLength) || 1);
    const targetCount = Math.max(
        2,
        Math.floor(availableLength / Math.max(24, minTickSpacing)) + 1
    );
    const configuredTicks = buildSliderTicks({
        min: floor,
        max: ceil,
        step,
        ticksArray,
        maxTicks: Math.max(1000, targetCount * 20),
    });
    // A selected domain can be smaller than the configured tick interval.
    // Fill that sparse result from the selected domain so the zoomed axis does
    // not collapse to two endpoint labels.
    const normalizedMinimumStep = toFiniteNumber(minimumStep);
    const minimumStepTicks = configuredTicks.length < targetCount &&
        normalizedMinimumStep !== null &&
        normalizedMinimumStep > 0
        ? buildSliderTicks({
            min: floor,
            max: ceil,
            step: normalizedMinimumStep,
            maxTicks: Math.max(1000, targetCount * 20),
        })
        : [];
    const allTicks = configuredTicks.length < targetCount
        ? uniqueSortedNumbers([
            ...configuredTicks,
            ...minimumStepTicks,
            floor,
            ceil,
        ])
        : configuredTicks;
    if (allTicks.length <= targetCount) return allTicks;

    const stride = Math.ceil((allTicks.length - 1) / (targetCount - 1));
    return uniqueSortedNumbers(
        allTicks.filter((_, index) => (
            index === 0 ||
            index === allTicks.length - 1 ||
            index % stride === 0
        ))
    );
};

/**
 * Label the current handle(s) and domain endpoints. Hide an endpoint when a
 * handle is too close to prevent overlap.
 */
export const buildSliderLabels = ({
    min,
    max,
    values,
    collisionRatio = 0.07,
}) => {
    const floor = toFiniteNumber(min);
    const ceil = toFiniteNumber(max);
    if (floor === null || ceil === null || ceil <= floor) return [];

    const handles = uniqueSortedNumbers(
        (Array.isArray(values) ? values : [values])
            .map(toFiniteNumber)
            .filter(value => (
                value !== null && value >= floor && value <= ceil
            ))
    );
    const span = ceil - floor;
    const isNearHandle = endpoint => handles.some(value => (
        value !== endpoint &&
        Math.abs(value - endpoint) / span < collisionRatio
    ));
    const labels = [...handles];

    if (!isNearHandle(floor)) labels.push(floor);
    if (!isNearHandle(ceil)) labels.push(ceil);
    return uniqueSortedNumbers(labels);
};

export const getSliderPosition = (value, min, max) => {
    const numeric = toFiniteNumber(value);
    const floor = toFiniteNumber(min);
    const ceil = toFiniteNumber(max);
    if (
        numeric === null || floor === null || ceil === null || ceil <= floor
    ) {
        return 0;
    }
    return Math.max(0, Math.min(100, (
        (numeric - floor) / (ceil - floor)
    ) * 100));
};
