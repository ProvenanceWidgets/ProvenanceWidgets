import test from 'node:test';
import assert from 'node:assert/strict';
import {
    findTemporalRecordAtPointer,
    formatAggregateTooltip,
    formatTemporalTooltip,
    getAggregateTooltipRecord,
    getTemporalRowTooltipProps,
    getTooltipAnchorProps,
    getWidgetLabel,
    suffixed,
} from '../src/components/provenanceTooltip.js';

const time = new Date('2026-07-07T13:09:07Z');
const stamp = time.toLocaleString();

test('formats aggregate radio/select content exactly like PW 1.0', () => {
    assert.equal(formatAggregateTooltip({
        label: 'id-radiobuttonGroup',
        value: 'London',
        record: { selections: 2, time },
        kind: 'single-selection',
    }), [
        'Label: id-radiobuttonGroup',
        'Selected value: London',
        '# times selected: 2',
        `Last selected at: ${stamp}`,
    ].join('\n'));
});

test('formats aggregate checkbox/multiselect content exactly like PW 1.0', () => {
    assert.equal(formatAggregateTooltip({
        label: 'checkbox-group',
        value: 'Beef',
        record: { interactions: 3, time },
        kind: 'multi-selection',
    }), [
        'Label: checkbox-group',
        'Selected value: Beef',
        '# times interacted: 3',
        `Last interacted at: ${stamp}`,
    ].join('\n'));
});

test('formats aggregate slider/range ordinals and input field order like PW 1.0', () => {
    assert.equal(formatAggregateTooltip({
        label: 'range-slider',
        value: [20, 40],
        record: { count: 3, time, index: 2 },
        kind: 'range',
        sequenceIndex: 2,
        sequenceTotal: 4,
    }), [
        'Label: range-slider',
        'Selected range: [20, 40]',
        '# times selected: 3',
        `Last selected at: ${stamp}`,
        '2nd/4th selection',
    ].join('\n'));

    assert.equal(formatAggregateTooltip({
        label: 'input-text',
        value: 'pizza',
        record: { count: 4, time },
        kind: 'input',
    }), [
        'Label: input-text',
        'Searched value: pizza',
        `Last searched at: ${stamp}`,
        '# times searched: 4',
    ].join('\n'));
});

test('formats closed and active temporal selections like PW 1.0', () => {
    const end = new Date(time.getTime() + 90_000);
    assert.equal(formatTemporalTooltip({
        label: 'checkbox-group',
        value: 'Beef',
        record: {
            select: { time },
            unselect: { time: end },
        },
        kind: 'multi-selection',
    }), [
        'Label: checkbox-group',
        'Selected value: Beef',
        `Selected at: ${stamp}`,
        `Unselected at: ${end.toLocaleString()}`,
        'Selected for: 1m',
    ].join('\n'));

    const now = new Date(time.getTime() + 30_000);
    assert.equal(formatTemporalTooltip({
        label: 'radiobutton-group',
        value: 'London',
        record: { select: { time } },
        kind: 'single-selection',
        now,
    }), [
        'Label: radiobutton-group',
        'Selected value: London',
        `Selected at: ${stamp}`,
        'Selected for: 30s',
    ].join('\n'));
});

test('formats temporal slider endpoints and input searches with PW ordinals', () => {
    assert.equal(formatTemporalTooltip({
        label: 'range-slider',
        value: 20,
        record: {
            value: 20,
            time,
            sequenceIndex: 1,
            sequenceTotal: 3,
        },
        kind: 'range',
    }), [
        'Label: range-slider',
        'Selected value: 20',
        `Selected at: ${stamp}`,
        '1st/3rd selection',
    ].join('\n'));

    assert.equal(formatTemporalTooltip({
        label: 'input-text',
        value: 'pizza',
        record: {
            value: 'pizza',
            select: { time },
            sequenceIndex: 0,
            sequenceTotal: 2,
        },
        kind: 'input',
    }), [
        'Label: input-text',
        '0th/2nd search',
        'Searched value: pizza',
        `Searched at: ${stamp}`,
    ].join('\n'));
});

test('uses the last select time for radio/select and interaction time for multi-select', () => {
    const unselectTime = new Date(time.getTime() + 5_000);
    const guidance = {
        aggregateData: new Map([
            ['London', { selections: 1, interactions: 2, time: unselectTime }],
        ]),
        detailedData: new Map([
            ['London', [{ select: { time }, unselect: { time: unselectTime } }]],
        ]),
    };

    assert.equal(
        getAggregateTooltipRecord(guidance, 'London', 'single-selection').time,
        time
    );
    assert.equal(
        getAggregateTooltipRecord(guidance, 'London', 'multi-selection').time,
        unselectTime
    );
});

test('creates row event handlers that show, follow, and hide the shared tooltip', () => {
    const calls = [];
    const tooltip = {
        show: (content, event) => calls.push(['show', content, event]),
        move: event => calls.push(['move', event]),
        hide: () => calls.push(['hide']),
    };
    const enterEvent = { clientX: 10 };
    const moveEvent = { clientX: 20 };
    const props = getTooltipAnchorProps(tooltip, 'Line one\nLine two');

    props.onMouseOver(enterEvent);
    props.onMouseMove(moveEvent);
    props.onMouseLeave();

    assert.equal(props['data-provenance-tooltip-content'], 'Line one\nLine two');
    assert.equal(props['aria-label'], 'Line one. Line two');
    assert.equal(props.tabIndex, 0);
    assert.equal(props.style.pointerEvents, 'auto');
    assert.deepEqual(calls, [
        ['show', 'Line one\nLine two', enterEvent],
        ['move', moveEvent],
        ['hide'],
    ]);
});

test('resolves lazy temporal content again while the pointer moves', () => {
    const calls = [];
    let content = 'Selected for: 1s';
    const tooltip = {
        show: value => calls.push(['show', value]),
        move: (_event, value) => calls.push(['move', value]),
        hide: () => {},
    };
    const props = getTooltipAnchorProps(tooltip, () => content);

    props.onMouseOver({});
    content = 'Selected for: 2s';
    props.onMouseMove({});

    assert.deepEqual(calls, [
        ['show', 'Selected for: 1s'],
        ['move', 'Selected for: 2s'],
    ]);
});

test('preserves the legacy react-tooltip anchor fallback', () => {
    const props = getTooltipAnchorProps('tooltip-id', 'Tooltip content');
    assert.equal(props['data-tooltip-id'], 'tooltip-id');
    assert.equal(props['data-tooltip-content'], 'Tooltip content');
});

test('matches PW ordinal and data-label fallback behavior', () => {
    assert.equal(suffixed(1), '1st');
    assert.equal(suffixed(2), '2nd');
    assert.equal(suffixed(3), '3rd');
    assert.equal(suffixed(11), '11th');
    assert.equal(getWidgetLabel({ 'data-label': 'Friendly label', label: 'Other' }, 'id'), 'Friendly label');
    assert.equal(getWidgetLabel({}, 'id'), 'id');
});

test('resolves temporal records across the plotted row and native control inset', () => {
    const first = {
        select: { index: 1, time },
        unselect: { index: 2, time: new Date(time.getTime() + 1_000) },
    };
    const second = {
        select: { index: 3, time: new Date(time.getTime() + 2_000) },
    };
    const records = [first, second];
    const bounds = { left: 100, right: 300 };

    assert.equal(findTemporalRecordAtPointer(records, 5, 80, bounds), first);
    assert.equal(findTemporalRecordAtPointer(records, 5, 120, bounds), first);
    assert.equal(findTemporalRecordAtPointer(records, 5, 180, bounds), null);
    assert.equal(findTemporalRecordAtPointer(records, 5, 240, bounds), second);
});

test('temporal row handlers cover labels and controls without overriding direct bars', () => {
    const calls = [];
    const tooltip = {
        show: content => calls.push(['show', content]),
        move: (_event, content) => calls.push(['move', content]),
        hide: () => calls.push(['hide']),
    };
    const records = [{ select: { index: 1, time } }];
    const ordinaryTarget = { closest: () => null };
    const directBarTarget = { closest: () => ({}) };
    const props = getTemporalRowTooltipProps(tooltip, {
        records,
        maxIndex: 2,
        getBounds: () => ({ left: 100, right: 300 }),
        label: 'radiobutton-group',
        value: 'Cheese',
        kind: 'single-selection',
    });

    props.onMouseOver({ target: ordinaryTarget, clientX: 80 });
    props.onMouseMove({ target: ordinaryTarget, clientX: 120 });
    props.onMouseOver({ target: directBarTarget, clientX: 120 });

    assert.match(calls[0][1], /Label: radiobutton-group/);
    assert.match(calls[0][1], /Selected value: Cheese/);
    assert.equal(calls[0][0], 'show');
    assert.equal(calls[1][0], 'move');
    assert.equal(calls.length, 2);
});
