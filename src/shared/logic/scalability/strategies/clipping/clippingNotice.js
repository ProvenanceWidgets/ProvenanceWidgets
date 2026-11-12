import { resolveClippingConfig } from "./config.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

export const NO_HIDDEN_RECORDS = "No hidden records";

export function resolveClippingNoticePeriods({ records, scalability, width, mode }) {
    return ["temporal_view", "aggregate_view"].map(view => resolveClippingPeriod({
        records, mode, config: resolveClippingConfig(scalability, { view, width }),
    }));
}

/** Persistent while older history is hidden; synchronized views announce once. */
export function getClippingNotice(periods) {
    const messages = new Set();
    for (const period of periods) {
        if (!period.config.ready || period.boundary <= 0) continue;
        const hidden = Number(period.boundary.toFixed(2));
		const unit = period.config.triggerType === "time" ? "second" : "interaction";
        messages.add(`hide ${hidden} ${unit}${hidden === 1 ? "" : "s"}`);
    }
    return messages.size ? [...messages].join(" · ") : null;
}

/** Footprint badges report hidden interactions, including time-based clipping. */
export function getClippingBadgeMessage(periods) {
    const counts = new Set(periods
        .filter(period => period.config.strategy === "clipping" && period.config.ready && period.boundary > 0)
        .map(period => period.startCount)
        .filter(count => count > 0));
    return counts.size
        ? [...counts].map(count => `${count} record${count === 1 ? "" : "s"} hidden`).join(" · ")
        : null;
}

/** Only the displayed view determines whether the footprint carries a badge. */
export function resolveActiveClippingBadge(options) {
    const period = resolveClippingNoticePeriods(options).find(period =>
        period.config.view === (options.showTimeline ? "temporal_view" : "aggregate_view"));
    return {
        message: getClippingBadgeMessage([period]),
        revision: period.resetKey,
    };
}
