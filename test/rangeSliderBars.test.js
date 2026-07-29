import test from 'node:test';
import assert from 'node:assert/strict';
import { getRangeBarSegments } from '../src/components/rangeSliderBarData.js';

test('uses disjoint aggregate provenance buckets instead of overlapping history', () => {
    const guidance = {
        aggregateData: new Map([
            [0, { count: 0, highValue: 20, index: -1 }],
            [20, { count: 1, highValue: 40, index: 1 }],
            [40, { count: 3, highValue: 70, index: 3 }],
            [70, { count: 2, highValue: 90, index: 3 }],
            [90, { count: 0, highValue: 100, index: -1 }],
        ]),
    };

    assert.deepEqual(getRangeBarSegments(guidance, 0, 100, [0, 100]), [
        { low: 20, high: 40, count: 1, index: 1 },
        { low: 40, high: 70, count: 3, index: 3 },
        { low: 70, high: 90, count: 2, index: 3 },
    ]);
});

test('does not fabricate a bar from the controlled range before provenance exists', () => {
    const guidance = { aggregateData: new Map() };

    assert.deepEqual(getRangeBarSegments(guidance, 0, 100), []);
});

test('preserves the latest interaction time for range tooltip content', () => {
    const time = new Date('2026-07-07T13:09:07Z');
    const guidance = {
        aggregateData: new Map([
            [20, { count: 2, highValue: 40, index: 2, time }],
        ]),
    };

    assert.deepEqual(getRangeBarSegments(guidance, 0, 100, [0, 100]), [
        { low: 20, high: 40, count: 2, index: 2, time },
    ]);
});
