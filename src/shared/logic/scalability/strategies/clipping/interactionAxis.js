/** Map a temporal brush percentage to its linear interaction/time domain. */
export function axisToInteraction(position, { domain }) {
    const percent = Math.max(0, Math.min(100, Number(position) || 0));
    return domain[0] + (domain[1] - domain[0]) * percent / 100;
}
