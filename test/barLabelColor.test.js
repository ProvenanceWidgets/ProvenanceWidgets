import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getBarFillRatio,
    getBarLabelColor,
} from '../src/components/utils.js';

const guidanceWith = (record) => ({
    aggregateData: new Map([['option', record]]),
    domain: new Map([
        ['interactions', [0, 2]],
        ['index', [0, 3]],
    ]),
});

test('uses black when no provenance bar is rendered', () => {
    const guidance = guidanceWith({
        interactions: 0,
        index: 3,
    });

    assert.equal(
        getBarLabelColor('option', guidance, () => '#3b0a00'),
        'black'
    );
});

test('uses the scent contrast color when the provenance bar is visible', () => {
    const guidance = guidanceWith({
        interactions: 1,
        index: 3,
    });

    assert.equal(
        getBarLabelColor('option', guidance, () => '#3b0a00'),
        'white'
    );
});

test('uses black when an option has no aggregate record', () => {
    const guidance = {
        aggregateData: new Map(),
        domain: new Map([
            ['interactions', [0, 0]],
            ['index', [0, 0]],
        ]),
    };

    assert.equal(
        getBarLabelColor('option', guidance, () => '#3b0a00'),
        'black'
    );
});

test('calculates the visible bar ratio used to clip a two-color label', () => {
    const guidance = guidanceWith({
        interactions: 1,
        index: 3,
    });

    assert.equal(getBarFillRatio('option', guidance), 0.5);
});

test('clamps invalid or out-of-domain bar ratios', () => {
    const aboveDomain = guidanceWith({
        interactions: 5,
        index: 3,
    });
    const zeroWidthDomain = {
        aggregateData: new Map([
            ['option', { interactions: 1, index: 1 }],
        ]),
        domain: new Map([
            ['interactions', [0, 0]],
            ['index', [0, 1]],
        ]),
    };

    assert.equal(getBarFillRatio('option', aboveDomain), 1);
    assert.equal(getBarFillRatio('option', zeroWidthDomain), 0);
});
