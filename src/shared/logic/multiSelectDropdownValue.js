import {
    getSingleSelectOptionKey,
    resolveSingleSelectOption,
} from "./singleSelectDropdownValue.js";

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

const toArray = value => Array.isArray(value) ? value : [];

const valueKey = value => JSON.stringify(
    value === undefined ? null : value
);

const uniqueOptions = (options, config) => {
    const seen = new Set();
    return options.filter(option => {
        const key = valueKey(
            getSingleSelectOptionKey(option, config)
        );
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

/**
 * Resolve option objects or primitive values to the option
 * instances owned by the current options array.
 */
export const resolveMultiSelectOptions = (
    options,
    candidates,
    config = {}
) => {
    const resolved = toArray(candidates)
        .map(candidate =>
            resolveSingleSelectOption(options, candidate, config)
        )
        .filter(option => option !== null);
    const deduplicated = uniqueOptions(resolved, config);
    const optionOrder = new Map(
        options.map((option, index) => [
            valueKey(getSingleSelectOptionKey(option, config)),
            index,
        ])
    );

    return deduplicated.sort((left, right) => {
        const leftIndex = optionOrder.get(valueKey(
            getSingleSelectOptionKey(left, config)
        ));
        const rightIndex = optionOrder.get(valueKey(
            getSingleSelectOptionKey(right, config)
        ));
        if (leftIndex === undefined && rightIndex === undefined) return 0;
        if (leftIndex === undefined) return 1;
        if (rightIndex === undefined) return -1;
        return leftIndex - rightIndex;
    });
};

export const getControlledMultiSelectValue = (
    props,
    options,
    config
) => {
    if (hasOwn(props, "selected") && props.selected !== undefined) {
        return resolveMultiSelectOptions(
            options,
            props.selected,
            config
        );
    }
    if (hasOwn(props, "value") && props.value !== undefined) {
        return resolveMultiSelectOptions(
            options,
            props.value,
            config
        );
    }
    return undefined;
};

export const getInitialMultiSelectValue = (
    props,
    options,
    config
) => {
    const controlled = getControlledMultiSelectValue(
        props,
        options,
        config
    );
    if (controlled !== undefined) return controlled;
    if (
        hasOwn(props, "defaultSelected") &&
        props.defaultSelected !== undefined
    ) {
        return resolveMultiSelectOptions(
            options,
            props.defaultSelected,
            config
        );
    }
    return resolveMultiSelectOptions(
        options,
        props.defaultValue,
        config
    );
};

export const multiSelectToProvenanceValue = (
    selection,
    config
) => Array.from(new Set(
    toArray(selection)
        .map(option => getSingleSelectOptionKey(option, config))
        .filter(key => key !== null)
));

export const provenanceValueToMultiSelect = (
    value,
    options,
    config
) => resolveMultiSelectOptions(options, value, config);

export const isResolvableMultiSelectValue = (
    value,
    options,
    config
) => (
    Array.isArray(value) &&
    provenanceValueToMultiSelect(value, options, config).length ===
        new Set(value.map(item => valueKey(
            getSingleSelectOptionKey(item, config)
        ))).size
);

export const getPrimeMultiSelectValue = (
    selection,
    {
        optionValue,
    } = {}
) => toArray(selection).map(option => {
    if (
        optionValue &&
        option !== null &&
        typeof option === "object"
    ) {
        return option[optionValue];
    }
    // PrimeReact treats the conventional `value` field as the underlying
    // value when no explicit optionValue is provided.
    if (
        option !== null &&
        typeof option === "object" &&
        option.value !== undefined &&
        option.value !== null
    ) {
        return option.value;
    }
    return option;
});

export const multiSelectValueKey = value =>
    JSON.stringify(toArray(value));

export const getMultiSelectCaller = (
    previousValue,
    nextValue
) => {
    const previous = new Set(toArray(previousValue).map(valueKey));
    const next = new Set(toArray(nextValue).map(valueKey));
    const changed = [];

    toArray(nextValue).forEach(value => {
        if (!previous.has(valueKey(value))) changed.push(value);
    });
    toArray(previousValue).forEach(value => {
        if (!next.has(valueKey(value))) changed.push(value);
    });
    return changed.length === 1 ? changed[0] : undefined;
};

export const callMultiSelectCallbacks = (
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

const toComparablePoint = (value, mode) => {
    if (mode === "time") {
        const date = value instanceof Date ? value : new Date(value);
        const timestamp = date.getTime();
        return Number.isNaN(timestamp) ? null : timestamp;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

/**
 * The Temporal crosshair restores every option whose interval contains the
 * clicked position, not only the row that received the click.
 */
export const getMultiSelectKeysAtTimelinePoint = ({
    provenance,
    point,
    mode = "interaction",
}) => {
    const target = toComparablePoint(point, mode);
    if (
        target === null ||
        !(provenance?.detailedData instanceof Map)
    ) {
        return [];
    }

    const selected = [];
    for (const [key, records] of provenance.detailedData.entries()) {
        const active = (records ?? []).some(record => {
            const start = toComparablePoint(
                mode === "time"
                    ? record?.select?.time
                    : record?.select?.index,
                mode
            );
            const endValue = mode === "time"
                ? record?.unselect?.time
                : record?.unselect?.index;
            const end = endValue === undefined
                ? null
                : toComparablePoint(endValue, mode);
            return (
                start !== null &&
                start <= target &&
                (end === null || target <= end)
            );
        });
        if (active) selected.push(key);
    }
    return selected;
};

export const restoreMultiSelectTemporalValue = ({
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
