const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);

export const normalizeInputTextValue = (value, field) => {
    const candidate =
        field &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
            ? value[field]
            : value;

    if (candidate === undefined) return undefined;
    if (candidate === null) return "";
    return String(candidate);
};

export const getControlledInputTextValue = props => {
    if (!hasOwn(props, "value") || props.value === undefined) {
        return undefined;
    }
    return normalizeInputTextValue(props.value, props.field);
};

export const getInitialInputTextValue = props => {
    const controlled = getControlledInputTextValue(props);
    if (controlled !== undefined) return controlled;
    return normalizeInputTextValue(props.defaultValue, props.field);
};

export const getInputTextEventValue = (event, fallback = "") => {
    const liveValue =
        event?.currentTarget?.value ??
        event?.target?.value;
    return normalizeInputTextValue(
        liveValue === undefined ? fallback : liveValue
    );
};

/**
 * Preserve one Temporal point for every committed search.
 *
 * Aggregate data intentionally groups equal strings, while the Temporal view
 * must retain repeated searches as separate interactions.
 */
export const buildInputTextTemporalEntries = ({
    sortedRecords,
    hasRecordKinds,
    sequenceOffset = 1,
    sequenceTotal,
}) => {
    let interactionIndex = 0;

    return sortedRecords.map(([, record]) => {
        if (
            record.kind === undefined ||
            record.kind === "interaction"
        ) {
            interactionIndex += 1;
        }

        return [String(record.index), [{
            value: record.value,
            time: record.time,
            select: {
                index: record.index,
                time: record.time,
            },
            kind: record.kind,
            source: record.source,
            sequenceIndex: hasRecordKinds
                ? interactionIndex
                : Math.max(0, record.index - sequenceOffset),
            sequenceTotal,
        }]];
    });
};

export const callInputTextCallbacks = (
    props,
    value,
    event
) => {
    const callbacks = new Set([
        props.onChange,
        props.onInputChange,
        props.onValueChange,
        props.valueChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);
    callbacks.forEach(callback => callback(value, event));
};

export const restoreInputTextTemporalValue = ({
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
    return restoreWidgetValue(target, String(value), "history");
};
