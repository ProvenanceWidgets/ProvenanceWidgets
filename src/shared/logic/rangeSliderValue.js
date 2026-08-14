import { provenanceValuesEqual } from "@provenance-widgets/core";

const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

export const normalizeRangeSliderValue = (
    value,
    min = 0,
    max = 100
) => {
    if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !Number.isFinite(Number(min)) ||
        !Number.isFinite(Number(max)) ||
        Number(max) <= Number(min)
    ) {
        return null;
    }

    const values = value.map(Number);
    if (!values.every(Number.isFinite)) return null;

    const [low, high] = values
        .map(item => clamp(item, Number(min), Number(max)))
        .sort((left, right) => left - right);

    // A zero-width interval cannot be represented by RangedProvenance's
    // aggregate buckets, so keep the previous valid range in that case.
    if (low >= high) return null;
    return [low, high];
};

export const getControlledRangeSliderValue = (
    props,
    min,
    max
) => {
    if (Array.isArray(props.value)) {
        return normalizeRangeSliderValue(props.value, min, max);
    }
    if (
        props.value !== undefined &&
        props.highValue !== undefined
    ) {
        return normalizeRangeSliderValue(
            [props.value, props.highValue],
            min,
            max
        );
    }
    return null;
};

export const getInitialRangeSliderValue = (props, min, max) => {
    const controlled = getControlledRangeSliderValue(props, min, max);
    if (controlled) return controlled;

    const defaultCandidate = Array.isArray(props.defaultValue)
        ? props.defaultValue
        : (
            props.defaultValue !== undefined &&
            props.defaultHighValue !== undefined
                ? [props.defaultValue, props.defaultHighValue]
                : [min, max]
        );
    return (
        normalizeRangeSliderValue(defaultCandidate, min, max) ??
        [Number(min), Number(max)]
    );
};

export const rangeSliderValueKey = value =>
    Array.isArray(value) ? JSON.stringify(value) : null;

export const callRangeSliderCallbacks = (
    props,
    value,
    event
) => {
    const callbacks = new Set([
        props.onChange,
        props.onSelectedChange,
        props.selectedChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);

    callbacks.forEach(callback => callback([...value], event));
};

export const rangeSliderValuesEqual = (left, right) =>
    provenanceValuesEqual(left, right);
