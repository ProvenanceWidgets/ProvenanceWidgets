export function normalize(value, domain) {
    if (!domain || domain.length < 2) return 0;
    return (value - domain[0]) / (domain[1] - domain[0]);
}

export function generateRange(start, end, step = 1) {
    const length = Math.ceil((end - start) / step);
    return Array.from({ length }, (_, index) => start + index * step);
}
