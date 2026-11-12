import { getClippingBoundary } from "./trigger.js";

const timestamp = record => {
    const value = new Date(record?.timestamp).getTime();
    return Number.isFinite(value) ? value : null;
};

/** Shared display period for every widget; never removes source history. */
export function resolveClippingPeriod({ records = [], config, mode = "interaction" }) {
    const interactions = records.filter(record => record.kind === "interaction");
    let origin = Infinity;
    let latest = -Infinity;
    for (const record of records) {
        const time = timestamp(record);
        if (time !== null) {
            origin = Math.min(origin, time);
            latest = Math.max(latest, time);
        }
    }
    if (!Number.isFinite(origin)) origin = latest = 0;
    const byTime = config.triggerType === "time";
    const metric = byTime ? (latest - origin) / 1000 : interactions.length;
    const boundary = getClippingBoundary({ metric, config });
    const startTime = boundary
        ? byTime ? origin + boundary * 1000 : timestamp(interactions[boundary - 1]) ?? latest
        : origin;
    const cutoff = !boundary ? -1 : byTime
        ? records.findLastIndex(record => timestamp(record) !== null && timestamp(record) <= startTime)
        : records.indexOf(interactions[boundary - 1]);
    const startCount = byTime
        ? records.slice(0, cutoff + 1).filter(record => record.kind === "interaction").length
        : boundary;
    const usesTime = mode === "time";
    const start = usesTime ? (startTime - origin) / 1000 : startCount;
    const end = usesTime ? (latest - origin) / 1000 : interactions.length;
    return {
        config, boundary, cutoff, origin, latest, startTime, startCount, start, end,
        startLabel: `${usesTime ? "t" : "n"}=${start}`,
        nowLabel: config.enabled ? `now (${end})` : "now",
        resetKey: [config.strategy, config.triggerType, config.threshold, boundary, startCount, mode].join(":"),
    };
}
