/** Gaussian convolution on a uniform data-domain grid, renormalized at edges. */
export function smoothGaussian(samples, { sigma = 2, truncate = 3 } = {}) {
    const spacing = samples[1]?.value - samples[0]?.value;
    if (!(spacing > 0) || !(sigma > 0) || !(truncate > 0)) {
        return samples.map(sample => ({ ...sample }));
    }
    const radius = Math.min(samples.length - 1, Math.floor(sigma * truncate / spacing));
    const weights = Array.from({ length: radius + 1 }, (_, offset) =>
        Math.exp(-0.5 * (offset * spacing / sigma) ** 2));
    return samples.map((sample, index) => {
        let total = 0;
        let normalization = 0;
        for (let neighbor = Math.max(0, index - radius);
            neighbor <= Math.min(samples.length - 1, index + radius); neighbor += 1) {
            const weight = weights[Math.abs(neighbor - index)];
            total += weight * samples[neighbor].count;
            normalization += weight;
        }
        return { value: sample.value, count: total / normalization };
    });
}
