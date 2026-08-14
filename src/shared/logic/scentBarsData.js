export function getVisibleScentKeys(provenance, barKeys = []) {
    return barKeys.filter(key => (
        provenance?.aggregateData?.has?.(key) ||
        provenance?.detailedData?.has?.(key)
    ));
}

export function getMostRecentScentKey(
    provenance,
    visibleKeys,
    colorDomain = "index"
) {
    return visibleKeys.reduce((recent, key) => {
        if (recent === null) return key;
        const keyValue =
            provenance?.aggregateData?.get?.(key)?.[colorDomain] ??
            -Infinity;
        const recentValue =
            provenance?.aggregateData?.get?.(recent)?.[colorDomain] ??
            -Infinity;
        return keyValue > recentValue ? key : recent;
    }, null);
}

export function getRangeScentIntervals({
    provenance,
    rangeInterval,
    min,
    max,
    width,
}) {
    const records = provenance?.detailedData?.size > 0
        ? [...provenance.detailedData.values()].sort(
            (left, right) => left.index - right.index
        )
        : (
            Array.isArray(rangeInterval) &&
            rangeInterval.length === 2
                ? [{ value: rangeInterval, index: 1 }]
                : []
        );
    const getX = value => (
        max === min
            ? 0
            : ((value - min) / (max - min)) * width
    );

    return records
        .filter(record => (
            Array.isArray(record?.value) &&
            record.value.length === 2
        ))
        .map(record => {
            const low = Math.min(record.value[0], record.value[1]);
            const high = Math.max(record.value[0], record.value[1]);
            const x = getX(low);
            return {
                low,
                high,
                index: record.index,
                x,
                width: getX(high) - x,
            };
        });
}
