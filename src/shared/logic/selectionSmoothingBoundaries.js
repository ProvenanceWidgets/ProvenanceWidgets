import { color } from "d3";

/** Boundary widths are percentages of the track, capped to preserve segment interiors. */
export function buildSelectionSmoothingBoundaries(bars, radius = 1.2) {
    const limit = Number.isFinite(radius) ? Math.max(0, radius) : 1.2;
    const intervals = bars.map(bar => ({
        start: Math.max(0, Math.min(100, parseFloat(bar.left))),
        end: Math.max(0, Math.min(100, parseFloat(bar.left) + parseFloat(bar.width))),
        color: bar.color,
    })).filter(bar => Number.isFinite(bar.start) && Number.isFinite(bar.end) && bar.end > bar.start)
        .sort((a, b) => a.start - b.start);
    const segments = [];
    let cursor = 0;
    for (const interval of intervals) {
        const start = Math.max(cursor, interval.start);
        if (interval.end <= start) continue;
        if (start > cursor) segments.push({ start: cursor, end: start, color: '#fff' });
        segments.push({ ...interval, start });
        cursor = interval.end;
    }
    if (cursor < 100) segments.push({ start: cursor, end: 100, color: '#fff' });
    return segments.slice(1).flatMap((right, index) => {
        const left = segments[index];
        if ((color(left.color)?.formatRgb() ?? left.color) === (color(right.color)?.formatRgb() ?? right.color)) return [];
        const radius = Math.min(limit, (left.end - left.start) / 4, (right.end - right.start) / 4);
        if (!(radius > 0)) return [];
        return [{
            position: right.start,
            left: right.start - radius,
            width: 2 * radius,
            leftColor: left.color,
            rightColor: right.color,
        }];
    });
}
