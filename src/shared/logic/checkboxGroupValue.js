import {
    getSingleSelectOptionKey,
    getSingleSelectOptionLabel,
} from "./singleSelectDropdownValue.js";
import {
    getMultiSelectKeysAtTimelinePoint,
} from "./multiSelectDropdownValue.js";

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

const toArray = value => Array.isArray(value) ? value : [];

const keyOf = value =>
    JSON.stringify(value === undefined ? null : value);

export const getCheckboxOptionValue = (
    option,
    config = {}
) => getSingleSelectOptionKey(option, config);

export const getCheckboxOptionLabel = (
    option,
    config = {}
) => getSingleSelectOptionLabel(option, config);

export const resolveCheckboxGroupValue = (
    options,
    candidates,
    config = {}
) => {
    const optionKeys = (options ?? [])
        .map(option => getCheckboxOptionValue(option, config))
        .filter(value => value !== null);
    const candidateKeys = new Set(
        toArray(candidates)
            .map(option => getCheckboxOptionValue(option, config))
            .filter(value => value !== null)
            .map(keyOf)
    );

    if (optionKeys.length === 0) {
        return Array.from(new Set(
            toArray(candidates)
                .map(option =>
                    getCheckboxOptionValue(option, config)
                )
                .filter(value => value !== null)
        ));
    }

    return optionKeys.filter(
        (key, index) =>
            candidateKeys.has(keyOf(key)) &&
            optionKeys.findIndex(
                candidate => keyOf(candidate) === keyOf(key)
            ) === index
    );
};

export const isResolvableCheckboxGroupValue = (
    value,
    options,
    config = {}
) => {
    if (!Array.isArray(value)) return false;
    const requested = new Set(
        value
            .map(option => getCheckboxOptionValue(option, config))
            .filter(key => key !== null)
            .map(keyOf)
    );
    return resolveCheckboxGroupValue(
        options,
        value,
        config
    ).length === requested.size;
};

export const getControlledCheckboxGroupValue = (
    props,
    options,
    config
) => {
    if (hasOwn(props, "selected") && props.selected !== undefined) {
        return resolveCheckboxGroupValue(
            options,
            props.selected,
            config
        );
    }
    if (hasOwn(props, "value") && props.value !== undefined) {
        return resolveCheckboxGroupValue(
            options,
            props.value,
            config
        );
    }
    return undefined;
};

export const getInitialCheckboxGroupValue = (
    props,
    options,
    config,
    legacyChildValues = []
) => {
    const controlled = getControlledCheckboxGroupValue(
        props,
        options,
        config
    );
    if (controlled !== undefined) return controlled;
    if (
        hasOwn(props, "defaultSelected") &&
        props.defaultSelected !== undefined
    ) {
        return resolveCheckboxGroupValue(
            options,
            props.defaultSelected,
            config
        );
    }
    if (
        hasOwn(props, "defaultValue") &&
        props.defaultValue !== undefined
    ) {
        return resolveCheckboxGroupValue(
            options,
            props.defaultValue,
            config
        );
    }
    return resolveCheckboxGroupValue(
        options,
        legacyChildValues,
        config
    );
};

export const checkboxGroupValueKey = value =>
    JSON.stringify(toArray(value));

export const getCheckboxGroupCaller = (
    previousValue,
    nextValue
) => {
    const previous = new Set(toArray(previousValue).map(keyOf));
    const next = new Set(toArray(nextValue).map(keyOf));
    const changed = [];

    toArray(nextValue).forEach(value => {
        if (!previous.has(keyOf(value))) changed.push(value);
    });
    toArray(previousValue).forEach(value => {
        if (!next.has(keyOf(value))) changed.push(value);
    });
    return changed.length === 1 ? changed[0] : undefined;
};

export const callCheckboxGroupCallbacks = (
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

export const getCheckboxKeysAtTimelinePoint =
    getMultiSelectKeysAtTimelinePoint;

export const restoreCheckboxGroupTemporalValue = ({
    restoreWidgetValue,
    target,
    value,
}) => {
    if (
        typeof restoreWidgetValue !== "function" ||
        !Array.isArray(value)
    ) {
        return false;
    }
    return restoreWidgetValue(target, value, "history");
};
