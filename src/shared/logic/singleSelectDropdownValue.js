const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

const readOptionField = (option, field) => {
    if (
        !field ||
        option === null ||
        typeof option !== "object"
    ) {
        return undefined;
    }
    return option[field];
};

export const isSingleSelectOptionDisabled = (
    option,
    optionDisabled
) => {
    if (typeof optionDisabled === "function") {
        return optionDisabled(option) === true;
    }
    return readOptionField(
        option,
        typeof optionDisabled === "string"
            ? optionDisabled
            : "disabled"
    ) === true;
};

const normalizeKey = value => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" || typeof value === "number") {
        return value;
    }
    if (typeof value === "boolean") return String(value);
    return JSON.stringify(value);
};

export const getSingleSelectOptionKey = (
    option,
    {
        dataKey,
        optionValue,
    } = {}
) => {
    if (option === undefined || option === null) return null;
    if (typeof option !== "object") return normalizeKey(option);

    const fields = [
        dataKey,
        optionValue,
        "value",
        "code",
        "id",
        "label",
    ].filter(Boolean);

    for (const field of fields) {
        const candidate = readOptionField(option, field);
        if (candidate !== undefined && candidate !== null) {
            return normalizeKey(candidate);
        }
    }
    return normalizeKey(option);
};

export const getSingleSelectOptionLabel = (
    option,
    {
        optionLabel,
    } = {}
) => {
    if (option === undefined || option === null) return "";
    if (typeof option !== "object") return String(option);
    const label =
        readOptionField(option, optionLabel) ??
        readOptionField(option, "label") ??
        readOptionField(option, "name") ??
        getSingleSelectOptionKey(option);
    return label === null ? "" : String(label);
};

const keysEqual = (left, right) =>
    Object.is(left, right) ||
    (
        left !== null &&
        right !== null &&
        String(left) === String(right)
    );

export const resolveSingleSelectOption = (
    options,
    candidate,
    config = {}
) => {
    if (candidate === undefined || candidate === null) return null;
    const candidates = Array.isArray(candidate)
        ? candidate.slice(0, 1)
        : [candidate];
    if (candidates.length === 0) return null;

    const value = candidates[0];
    const direct = options.find(option => Object.is(option, value));
    if (direct !== undefined) return direct;

    const key = getSingleSelectOptionKey(value, config);
    const resolved = options.find(option =>
        keysEqual(getSingleSelectOptionKey(option, config), key)
    );
    if (resolved !== undefined) return resolved;

    // Preserve an object supplied before asynchronous options arrive. Once
    // options are available, the same stable key resolves to their instance.
    return typeof value === "object" ? value : null;
};

export const getControlledSingleSelectValue = (
    props,
    options,
    config
) => {
    if (hasOwn(props, "selected") && props.selected !== undefined) {
        return resolveSingleSelectOption(
            options,
            props.selected,
            config
        );
    }
    if (hasOwn(props, "value") && props.value !== undefined) {
        return resolveSingleSelectOption(
            options,
            props.value,
            config
        );
    }
    return undefined;
};

export const getInitialSingleSelectValue = (
    props,
    options,
    config
) => {
    const controlled = getControlledSingleSelectValue(
        props,
        options,
        config
    );
    if (controlled !== undefined) return controlled;
    if (
        hasOwn(props, "defaultSelected") &&
        props.defaultSelected !== undefined
    ) {
        return resolveSingleSelectOption(
            options,
            props.defaultSelected,
            config
        );
    }
    return resolveSingleSelectOption(
        options,
        props.defaultValue,
        config
    );
};

export const singleSelectToProvenanceValue = (
    selection,
    config
) => getSingleSelectOptionKey(selection, config);

export const provenanceValueToSingleSelect = (
    value,
    options,
    config
) => resolveSingleSelectOption(options, value, config);

export const getPrimeSingleSelectValue = (
    selection,
    {
        optionValue,
    } = {}
) => {
    if (
        optionValue &&
        selection !== null &&
        typeof selection === "object"
    ) {
        return selection[optionValue];
    }
    // PrimeReact implicitly treats an option's `value` field as its value
    // even when optionValue is omitted.
    if (
        selection !== null &&
        typeof selection === "object" &&
        selection.value !== undefined &&
        selection.value !== null
    ) {
        return selection.value;
    }
    return selection;
};

export const singleSelectValueKey = value =>
    JSON.stringify(value === undefined ? null : value);

export const getSingleSelectCaller = (
    previousValue,
    nextValue
) => (
    nextValue !== null && nextValue !== undefined
        ? nextValue
        : previousValue
);

export const callSingleSelectCallbacks = (
    props,
    selection,
    event
) => {
    const callbacks = new Set([
        props.onSelectedChange,
        props.selectedChange,
        props.onChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);
    callbacks.forEach(callback => callback(selection, event));
};

export const restoreSingleSelectTemporalValue = ({
    restoreWidgetValue,
    target,
    value,
}) => {
    if (
        typeof restoreWidgetValue !== "function" ||
        value === undefined
    ) {
        return false;
    }
    return restoreWidgetValue(target, value, "history");
};
