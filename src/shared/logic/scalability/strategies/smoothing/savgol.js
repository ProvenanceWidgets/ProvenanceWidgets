import savgol from "../../../../../../vendor/js-savgol-filter/js-savgol-filter.js";

const { SavgolFilter } = savgol;

/** Adapt the public window size and coefficient count to the vendored filter. */
export function smoothSavgol(samples, { window_size = 5, degree = 3 } = {}) {
    if (!Number.isInteger(window_size) || window_size < 3 || window_size % 2 === 0 ||
        !Number.isInteger(degree) || degree < 1 ||
        window_size <= degree || samples.length < window_size) {
        return samples.map(sample => ({ ...sample }));
    }

    const filter = new SavgolFilter((window_size - 1) / 2, degree - 1);
    const counts = filter.filter(samples.map(sample => sample.count));
    return samples.map((sample, index) => ({
        value: sample.value,
        count: Number.isFinite(counts[index]) ? counts[index] : sample.count,
    }));
}
