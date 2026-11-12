/** Nonzero Cox-de Boor basis functions; at most degree + 1 per sample. */
function basisAt(value, knots, degree, count) {
    let low = degree;
    let high = count;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (value < knots[middle + 1]) high = middle;
        else low = middle + 1;
    }
    const span = Math.min(count - 1, low);
    const basis = [1];
    const left = [];
    const right = [];
    for (let order = 1; order <= degree; order += 1) {
        left[order] = value - knots[span + 1 - order];
        right[order] = knots[span + order] - value;
        let saved = 0;
        for (let index = 0; index < order; index += 1) {
            const denominator = right[index + 1] + left[order - index];
            const term = denominator > 0 ? basis[index] / denominator : 0;
            basis[index] = saved + right[index + 1] * term;
            saved = left[order - index] * term;
        }
        basis[order] = saved;
    }
    return { start: span - degree, values: basis };
}

/** Solve a symmetric positive definite band matrix in O(count * bandwidth^2). */
function solveBanded(matrix, target, bandwidth) {
    const count = target.length;
    for (let row = 0; row < count; row += 1) {
        for (let column = Math.max(0, row - bandwidth); column <= row; column += 1) {
            let value = matrix[row][row - column];
            for (let previous = Math.max(0, row - bandwidth); previous < column; previous += 1) {
                value -= matrix[row][row - previous] * matrix[column][column - previous];
            }
            if (column === row) {
                if (!(value > 0) || !Number.isFinite(value)) return null;
                matrix[row][0] = Math.sqrt(value);
            } else matrix[row][row - column] = value / matrix[column][0];
        }
    }
    const solution = [...target];
    for (let row = 0; row < count; row += 1) {
        for (let column = Math.max(0, row - bandwidth); column < row; column += 1) {
            solution[row] -= matrix[row][row - column] * solution[column];
        }
        solution[row] /= matrix[row][0];
    }
    for (let row = count - 1; row >= 0; row -= 1) {
        for (let column = row + 1; column <= Math.min(count - 1, row + bandwidth); column += 1) {
            solution[row] -= matrix[column][column - row] * solution[column];
        }
        solution[row] /= matrix[row][0];
    }
    return solution;
}

export function smoothBspline(samples, {
    degree = 3, smoothing_factor = 0.5, knot_spacing = 10,
} = {}) {
    const min = samples[0]?.value;
    const width = samples.at(-1)?.value - min;
    if (samples.length <= degree || !(width > 0)) return samples.map(sample => ({ ...sample }));
    // The infinite-penalty limit is the least-squares affine signal.
    if (smoothing_factor >= 1 - 1e-6) {
        const mean = samples.reduce((sum, sample) => sum + sample.count, 0) / samples.length;
        let covariance = 0;
        let variance = 0;
        for (const sample of samples) {
            const position = (sample.value - min) / width - 0.5;
            covariance += position * (sample.count - mean);
            variance += position ** 2;
        }
        const slope = covariance / variance;
        return samples.map(sample => ({ value: sample.value,
            count: mean + slope * ((sample.value - min) / width - 0.5) }));
    }
    // Limit basis size to available observations, independently of requested knots.
    const requested = Math.ceil(width / knot_spacing) - 1;
    // Leave multiple observations per span to avoid rank-deficient dense fits.
    const interiorCount = Math.min(Math.floor((samples.length - degree - 1) / 2), requested);
    const interior = Array.from({ length: interiorCount }, (_, index) =>
        requested === interiorCount ? (index + 1) * knot_spacing / width
            : (index + 1) / (interiorCount + 1));
    const knots = [...Array(degree + 1).fill(0), ...interior, ...Array(degree + 1).fill(1)];
    const count = interiorCount + degree + 1;
    const bandwidth = Math.max(degree, 2);
    const matrix = Array.from({ length: count }, () => Array(bandwidth + 1).fill(0));
    const target = Array(count).fill(0);
    const bases = samples.map(sample => basisAt((sample.value - min) / width, knots, degree, count));
    const addOuter = (start, values, weight) => {
        for (let row = 0; row < values.length; row += 1) {
            for (let column = 0; column <= row; column += 1) {
                matrix[start + row][row - column] += weight * values[row] * values[column];
            }
        }
    };
    bases.forEach((basis, index) => {
        addOuter(basis.start, basis.values, 1);
        basis.values.forEach((value, offset) => {
            target[basis.start + offset] += value * samples[index].count;
        });
    });
    // Greville abscissae make the curvature penalty vanish for affine signals,
    // including near the repeated (clamped) endpoint knots.
    const greville = Array.from({ length: count }, (_, index) =>
        knots.slice(index + 1, index + degree + 1).reduce((sum, value) => sum + value, 0) / degree);
    const strength = samples.length / count * (smoothing_factor / (1 - smoothing_factor)) ** 2;
    for (let index = 0; index < count - 2; index += 1) {
        const left = (greville[index + 1] - greville[index]) * (count - 1);
        const right = (greville[index + 2] - greville[index + 1]) * (count - 1);
        addOuter(index, [1 / left, -1 / left - 1 / right, 1 / right], strength);
    }
    const coefficients = solveBanded(matrix, target, bandwidth);
    if (!coefficients) return samples.map(sample => ({ ...sample }));
    return samples.map((sample, index) => ({
        value: sample.value,
        count: bases[index].values.reduce((sum, value, offset) =>
            sum + value * coefficients[bases[index].start + offset], 0),
    }));
}
