function formatDate(value) {
    if (!value) return 'N/A';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
}

function formatValue(value) {
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    if (value === null || value === undefined) return '';
    return String(value);
}

function formatDuration(startValue, endValue) {
    if (!startValue || !endValue) return null;
    const start = startValue instanceof Date ? startValue : new Date(startValue);
    const end = endValue instanceof Date ? endValue : new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

    const seconds = Math.max(
        0,
        Math.floor(end.getTime() / 1000) - Math.floor(start.getTime() / 1000)
    );
    if (seconds <= 60) return `${seconds}s`;

    const minutes = Math.max(
        0,
        Math.floor(end.getTime() / 60_000) - Math.floor(start.getTime() / 60_000)
    );
    return `${minutes}m`;
}

export function suffixed(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);

    const j = number % 10;
    const k = number % 100;
    if (j === 1 && k !== 11) return `${number}st`;
    if (j === 2 && k !== 12) return `${number}nd`;
    if (j === 3 && k !== 13) return `${number}rd`;
    return `${number}th`;
}

function formatSequenceLine(noun, index, total) {
    if (!Number.isFinite(Number(index)) || !Number.isFinite(Number(total))) {
        return null;
    }
    return `${suffixed(index)}/${suffixed(total)} ${noun}`;
}

export function getWidgetLabel(props, fallback) {
    return props?.['data-label'] || props?.dataLabel || props?.label || fallback;
}

export function getAggregateTooltipRecord(guidance, value, kind) {
    const aggregateRecord = guidance?.aggregateData?.get?.(value);
    if (!aggregateRecord) return null;

    const detailedRecords = guidance?.detailedData?.get?.(value);
    if (!Array.isArray(detailedRecords) || detailedRecords.length === 0) {
        return aggregateRecord;
    }

    const latest = detailedRecords[detailedRecords.length - 1];
    const time = kind === 'single-selection'
        ? latest?.select?.time
        : latest?.unselect?.time ?? latest?.select?.time;

    return time ? { ...aggregateRecord, time } : aggregateRecord;
}

export function formatAggregateTooltip({
    label,
    value,
    record,
    kind = 'single-selection',
    sequenceIndex,
    sequenceTotal,
}) {
    if (!record) return null;

    let valueLabel = 'Selected value';
    let countLabel = '# times selected';
    let timeLabel = 'Last selected at';
    let count = record.selections ?? record.count ?? record.interactions ?? 0;

    if (kind === 'multi-selection') {
        countLabel = '# times interacted';
        timeLabel = 'Last interacted at';
        count = record.interactions ?? record.selections ?? record.count ?? 0;
    } else if (kind === 'input') {
        return [
            `Label: ${label}`,
            `Searched value: ${formatValue(value)}`,
            `Last searched at: ${formatDate(record.time)}`,
            `# times searched: ${record.count ?? 0}`,
        ].join('\n');
    } else if (kind === 'range') {
        valueLabel = 'Selected range';
        count = record.count ?? 0;
    }

    const lines = [
        `Label: ${label}`,
        `${valueLabel}: ${formatValue(value)}`,
        `${countLabel}: ${count}`,
        `${timeLabel}: ${formatDate(record.time)}`,
    ];

    if (kind === 'slider' || kind === 'range') {
        const sequenceLine = formatSequenceLine(
            'selection',
            sequenceIndex ?? record.index,
            sequenceTotal
        );
        if (sequenceLine) lines.push(sequenceLine);
    }

    return lines.join('\n');
}

export function formatTemporalTooltip({
    label,
    value,
    record,
    kind = 'single-selection',
    sequenceIndex,
    sequenceTotal,
    now = new Date(),
}) {
    if (!record) return null;

    const actualValue = record.value ?? value;
    const startTime = record.select?.time ?? record.time;
    const endTime = record.unselect?.time;

    if (kind === 'slider' || kind === 'range') {
        const lines = [
            `Label: ${label}`,
            `Selected value: ${formatValue(actualValue)}`,
            `Selected at: ${formatDate(startTime)}`,
        ];
        const sequenceLine = formatSequenceLine(
            'selection',
            sequenceIndex ?? record.sequenceIndex ?? record.index,
            sequenceTotal ?? record.sequenceTotal
        );
        if (sequenceLine) lines.push(sequenceLine);
        return lines.join('\n');
    }

    if (kind === 'input') {
        const lines = [
            `Label: ${label}`,
        ];
        const sequenceLine = formatSequenceLine(
            'search',
            sequenceIndex ?? record.sequenceIndex ?? record.index,
            sequenceTotal ?? record.sequenceTotal
        );
        if (sequenceLine) lines.push(sequenceLine);
        lines.push(
            `Searched value: ${formatValue(actualValue)}`,
            `Searched at: ${formatDate(startTime)}`,
        );
        return lines.join('\n');
    }

    const lines = [
        `Label: ${label}`,
        `Selected value: ${formatValue(actualValue)}`,
        `Selected at: ${formatDate(startTime)}`,
    ];

    if (endTime) {
        lines.push(`Unselected at: ${formatDate(endTime)}`);
    }
    const duration = formatDuration(startTime, endTime ?? now);
    if (duration) lines.push(`Selected for: ${duration}`);

    return lines.join('\n');
}

export function getTooltipAnchorProps(tooltip, content, options = {}) {
    const resolveContent = () => (
        typeof content === 'function' ? content() : content
    );
    const initialContent = resolveContent();
    if (!tooltip || !initialContent) return {};

    const sharedProps = {
        'aria-label': initialContent.replace(/\n/g, '. '),
        'data-provenance-tooltip-content': initialContent,
        ...(options.focusable === false ? {} : { tabIndex: 0 }),
        style: {
            pointerEvents: 'auto',
            cursor: 'help',
            ...options.style,
        },
    };

    if (typeof tooltip === 'object' && tooltip.show && tooltip.hide) {
        return {
            ...sharedProps,
            // PW 1.0 deliberately uses bubbling mouseover on the row container.
            // That lets a child radio/checkbox/label remain clickable while the
            // parent still owns the tooltip.
            onMouseOver: event => tooltip.show(resolveContent(), event),
            onMouseMove: event => tooltip.move?.(event, resolveContent()),
            onMouseLeave: () => tooltip.hide(),
            onFocus: event => tooltip.show(resolveContent(), event),
            onBlur: () => tooltip.hide(),
        };
    }

    return {
        ...sharedProps,
        'data-tooltip-id': tooltip,
        'data-tooltip-content': initialContent,
    };
}

export function findTemporalRecordAtPointer(records, maxIndex, clientX, bounds) {
    const selectableRecords = Array.isArray(records)
        ? records
            .filter(record => record?.select)
            .sort((a, b) => (a.select.index ?? 0) - (b.select.index ?? 0))
        : [];

    if (selectableRecords.length === 0) return null;
    if (!Number.isFinite(clientX) || !bounds) {
        return selectableRecords[selectableRecords.length - 1];
    }

    const left = Number(bounds.left);
    const right = Number(bounds.right);
    if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) {
        return selectableRecords[selectableRecords.length - 1];
    }

    // The native radio/checkbox sits just before the temporal plot. PW 1.0
    // listens on the entire option row, so hovering that control resolves to
    // the first visible interval rather than losing the tooltip altogether.
    if (clientX <= left) return selectableRecords[0];
    if (clientX > right) return null;

    const indexOffset = 1;
    const displayMax = Math.max((maxIndex ?? 0) - indexOffset, 1);
    const plotWidth = right - left;

    return selectableRecords.find(record => {
        const start = Math.max(0, (record.select.index ?? 0) - indexOffset);
        const end = Math.max(
            start,
            (record.unselect?.index ?? maxIndex ?? 0) - indexOffset
        );
        const startX = left + ((start / displayMax) * plotWidth);
        const endX = left + ((end / displayMax) * plotWidth);

        // TimelineVis gives zero/short intervals an 8px visual target. Mirror
        // that geometry here so a label above a short bar resolves identically.
        return clientX >= startX && clientX <= Math.max(endX, startX + 8);
    }) ?? null;
}

export function getTemporalRowTooltipProps(tooltip, {
    records,
    maxIndex,
    getBounds,
    label,
    value,
    kind = 'single-selection',
}) {
    const availableRecords = Array.isArray(records)
        ? records.filter(record => record?.select)
        : [];
    if (!tooltip || availableRecords.length === 0) return {};

    const latestRecord = availableRecords[availableRecords.length - 1];
    const latestContent = formatTemporalTooltip({
        label,
        value,
        record: latestRecord,
        kind,
    });
    if (!latestContent) return {};

    // TimelineVis owns events on a directly hit bar. The row handler fills the
    // gaps created by labels and native controls layered above that bar.
    const isDirectTimelineBar = event => (
        event?.target?.closest?.('[data-provenance-timeline-bar="true"]')
    );

    const resolveContent = event => {
        const source = event?.nativeEvent ?? event;
        const record = findTemporalRecordAtPointer(
            availableRecords,
            maxIndex,
            source?.clientX,
            getBounds?.()
        );
        return record
            ? formatTemporalTooltip({ label, value, record, kind })
            : null;
    };

    if (typeof tooltip !== 'object' || !tooltip.show || !tooltip.hide) {
        return getTooltipAnchorProps(tooltip, latestContent, { focusable: false });
    }

    const show = event => {
        if (isDirectTimelineBar(event)) return;
        const content = resolveContent(event);
        if (content) tooltip.show(content, event);
        else tooltip.hide();
    };
    const move = event => {
        if (isDirectTimelineBar(event)) return;
        const content = resolveContent(event);
        if (content) tooltip.move?.(event, content);
        else tooltip.hide();
    };

    return {
        'data-provenance-temporal-row': 'true',
        'data-provenance-tooltip-content': latestContent,
        onMouseOver: show,
        onMouseMove: move,
        onMouseLeave: () => tooltip.hide(),
        onFocus: event => {
            if (isDirectTimelineBar(event)) return;
            tooltip.show(latestContent, event);
        },
        onBlur: () => tooltip.hide(),
        style: {
            pointerEvents: 'auto',
            cursor: 'help',
        },
    };
}
