import {
    getSingleSelectOptionKey,
    getSingleSelectOptionLabel,
} from "./singleSelectDropdownValue.js";

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

const keysEqual = (left, right) =>
    Object.is(left, right) ||
    (
        left !== null &&
        right !== null &&
        String(left) === String(right)
    );

export const getRadioOptionValue = (option, config = {}) =>
    getSingleSelectOptionKey(option, config);

export const getRadioOptionLabel = (option, config = {}) =>
    getSingleSelectOptionLabel(option, config);

export const resolveRadioGroupValue = (
    options,
    candidate,
    config = {}
) => {
    const value = Array.isArray(candidate)
        ? candidate[0]
        : candidate;
    if (value === undefined || value === null) return null;

    const candidateKey = getRadioOptionValue(value, config);
    const matchingOption = (options ?? []).find(option =>
        keysEqual(
            getRadioOptionValue(option, config),
            candidateKey
        )
    );
    if (matchingOption !== undefined) {
        return getRadioOptionValue(matchingOption, config);
    }

    // Children can register after the group controller is created. Preserve a
    // primitive value until those child values are available.
    if ((options ?? []).length === 0) return candidateKey;
    return null;
};

export const getControlledRadioGroupValue = (
    props,
    options,
    config
) => {
    if (hasOwn(props, "selected") && props.selected !== undefined) {
        return resolveRadioGroupValue(
            options,
            props.selected,
            config
        );
    }
    if (hasOwn(props, "value") && props.value !== undefined) {
        return resolveRadioGroupValue(
            options,
            props.value,
            config
        );
    }
    return undefined;
};

export const getInitialRadioGroupValue = (
    props,
    options,
    config,
    legacyChildValue
) => {
    const controlled = getControlledRadioGroupValue(
        props,
        options,
        config
    );
    if (controlled !== undefined) return controlled;
    if (
        hasOwn(props, "defaultSelected") &&
        props.defaultSelected !== undefined
    ) {
        return resolveRadioGroupValue(
            options,
            props.defaultSelected,
            config
        );
    }
    if (
        hasOwn(props, "defaultValue") &&
        props.defaultValue !== undefined
    ) {
        return resolveRadioGroupValue(
            options,
            props.defaultValue,
            config
        );
    }
    return resolveRadioGroupValue(
        options,
        legacyChildValue,
        config
    );
};

export const radioGroupValueKey = value =>
    JSON.stringify(value === undefined ? null : value);

export const getRadioGroupCaller = (
    previousValue,
    nextValue
) => (
    nextValue !== null && nextValue !== undefined
        ? nextValue
        : previousValue
);

export const callRadioGroupCallbacks = (
    props,
    value,
    event
) => {
    const callbacks = new Set([
        props.onSelectedChange,
        props.selectedChange,
        props.onChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);
    callbacks.forEach(callback => callback(value, event));
};

export const restoreRadioGroupTemporalValue = ({
    restoreWidgetValue,
    target,
    value,
}) => {
    if (
        typeof restoreWidgetValue !== "function" ||
        value === undefined ||
        value === null
    ) {
        return false;
    }
    return restoreWidgetValue(target, value, "history");
};
