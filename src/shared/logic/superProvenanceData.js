export {
    getRegisteredWidgetValueAtTime,
    restoreRegisteredWidgetsAtTime,
} from "@provenance-widgets/core";

const isInteractionRecord = record =>
    record?.kind === undefined || record.kind === "interaction";

const toDate = value => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const getSuperInteractionSummaries = superProvenance => {
    if (!superProvenance?.registeredWidgets) return [];

    const summaries = [];
    for (const widgetId of superProvenance.registeredWidgets.keys()) {
        const interactions = (
            superProvenance.detailedData?.get(widgetId) ?? []
        ).filter(isInteractionRecord);
        if (interactions.length === 0) continue;

        const latest = interactions.reduce((current, candidate) =>
            (candidate.index ?? -1) > (current.index ?? -1)
                ? candidate
                : current
        );
        summaries.push({
            widgetId,
            interactionCount: interactions.length,
            lastInteractionTime: toDate(latest.time),
        });
    }
    return summaries;
};

export const getSuperWidgetColorMap = (
    superProvenance,
    getColor = index => String(index)
) => {
    if (!superProvenance?.registeredWidgets) return {};

    return Object.fromEntries(
        Array.from(superProvenance.registeredWidgets.keys()).map(
            (widgetId, index) => [widgetId, getColor(index)]
        )
    );
};

export const getSuperWidgetIds = superProvenance =>
    superProvenance?.registeredWidgets
        ? Array.from(superProvenance.registeredWidgets.keys())
        : [];

export const buildSuperAggregateBoxes = ({
    superProvenance,
    getColor = index => String(index),
    width = 400,
    emptyWidth = 20,
}) => {
    if (!superProvenance?.registeredWidgets) return [];

    const colorMap = getSuperWidgetColorMap(
        superProvenance,
        getColor
    );
    const widgetIds = getSuperWidgetIds(superProvenance);
    const summaries = getSuperInteractionSummaries(superProvenance);
    const summaryByWidget = new Map(
        summaries.map(summary => [summary.widgetId, summary])
    );
    const nonInteractedCount =
        widgetIds.length - summaries.length;
    const availableWidth = Math.max(
        0,
        width - (nonInteractedCount * emptyWidth)
    );
    const totalInteractions = summaries.reduce(
        (sum, summary) => sum + summary.interactionCount,
        0
    );

    // Empty widgets keep a fixed outline; active widgets share the rest.
    return widgetIds
        .map(widgetId => {
            const summary = summaryByWidget.get(widgetId);
            if (!summary) {
                return {
                    widgetId,
                    interactionCount: 0,
                    lastInteractionTime: null,
                    color: colorMap[widgetId],
                    width: emptyWidth,
                };
            }
            return {
                ...summary,
                color: colorMap[widgetId],
                width: totalInteractions > 0
                    ? (
                        summary.interactionCount /
                        totalInteractions
                    ) * availableWidth
                    : 0,
            };
        })
        .sort((left, right) =>
            !left.lastInteractionTime && !right.lastInteractionTime
                ? 0
                : !left.lastInteractionTime
                    ? -1
                    : !right.lastInteractionTime
                        ? 1
                        : (
                            left.lastInteractionTime.getTime() -
                            right.lastInteractionTime.getTime()
                        )
        );
};

export const buildSuperInteractionSequence = ({
    superProvenance,
    registeredComponents,
    widgetColors = {},
    getColor = index => String(index),
}) => {
    if (
        !superProvenance?.registeredWidgets ||
        !(registeredComponents instanceof Map)
    ) {
        return [];
    }

    const interactions = [];
    const widgetIds = Array.from(superProvenance.registeredWidgets.keys());

    widgetIds.forEach((widgetId, widgetIndex) => {
        const widgetProvenance = registeredComponents.get(widgetId);
        if (
            !widgetProvenance?.detailedData ||
            widgetProvenance.hasUserInteracted === false
        ) {
            return;
        }

        const color = widgetColors[widgetId] ?? getColor(widgetIndex);
        const entries = Array.from(widgetProvenance.detailedData.entries());
        const first = entries[0];
        const isGeneric =
            first &&
            typeof first[0] === "number" &&
            first[1] &&
            typeof first[1] === "object" &&
            !Array.isArray(first[1]) &&
            "value" in first[1];
        const isSelection =
            first &&
            typeof first[0] === "string" &&
            Array.isArray(first[1]) &&
            first[1][0]?.select;

        if (isGeneric) {
            entries.forEach(([indexKey, record]) => {
                if (
                    !record ||
                    !("time" in record) ||
                    !isInteractionRecord(record)
                ) {
                    return;
                }
                interactions.push({
                    widgetId,
                    color,
                    time: toDate(record.time),
                    index: record.index ?? indexKey,
                    value: record.value,
                });
            });
            return;
        }

        if (isSelection) {
            entries.forEach(([value, records]) => {
                records.forEach(record => {
                    if (
                        !record?.select ||
                        !isInteractionRecord(record.select)
                    ) {
                        return;
                    }
                    interactions.push({
                        widgetId,
                        color,
                        time: toDate(record.select.time),
                        index: record.select.index,
                        value,
                    });
                });
            });
            return;
        }

        entries.forEach(([value, records]) => {
            if (!Array.isArray(records)) return;
            records.forEach(record => {
                if (
                    !record ||
                    (!record.time && record.index === undefined) ||
                    !isInteractionRecord(record)
                ) {
                    return;
                }
                interactions.push({
                    widgetId,
                    color,
                    time: toDate(record.time),
                    index: record.index,
                    value,
                });
            });
        });
    });

    interactions.sort((left, right) => {
        if (left.time && right.time) {
            const timeDifference =
                left.time.getTime() - right.time.getTime();
            if (timeDifference !== 0) return timeDifference;
        }
        return (left.index ?? 0) - (right.index ?? 0);
    });

    const width = interactions.length > 0
        ? `${100 / interactions.length}%`
        : "0%";
    return interactions.map(interaction => ({ ...interaction, width }));
};
