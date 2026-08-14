import { color } from "d3-color";
import { normalize } from "./valueMath.js";

export function getScentColor(value, provenance, orientationScheme, colorDomain = "index") {
    if (!provenance || !provenance.aggregateData || !provenance.domain) return null;

    const data = provenance.aggregateData.get(value);
    if (!data) return null;

    const norm = normalize(
        data?.[colorDomain],
        provenance.domain.get(colorDomain)
    );

    return orientationScheme(norm);
}

export function getContrastColor(backgroundColor) {
    if (!backgroundColor) return 'black';
    const c = color(backgroundColor);
    if (!c) return 'black';

    const luminance = 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255);

    return luminance < 0.5 ? 'white' : 'black';
}

/**
 * Pick a label color for a provenance bar row.
 *
 * A selection can have aggregate data with a recent (dark) scent color while
 * its position value is zero. In that case Bars renders a zero-width bar, so
 * using the scent color alone would incorrectly put white text on the panel's
 * white background. Checking the same position measure used by Bars keeps the
 * result deterministic across OS/browser compositors.
 */
export function getBarLabelColor(
    value,
    provenance,
    orientationScheme,
    positionDomain = 'interactions',
    colorDomain = 'index'
) {
    const record = provenance?.aggregateData?.get?.(value);
    const position = Number(record?.[positionDomain]);
    const domainStart = Number(provenance?.domain?.get?.(positionDomain)?.[0] ?? 0);

    if (!Number.isFinite(position) || position <= domainStart) {
        return 'black';
    }

    return getContrastColor(
        getScentColor(value, provenance, orientationScheme, colorDomain)
    );
}

export function getBarFillRatio(
    value,
    provenance,
    positionDomain = 'interactions'
) {
    const position = Number(
        provenance?.aggregateData?.get?.(value)?.[positionDomain]
    );
    const domain = provenance?.domain?.get?.(positionDomain);
    const domainStart = Number(domain?.[0]);
    const domainEnd = Number(domain?.[1]);

    if (
        !Number.isFinite(position)
        || !Number.isFinite(domainStart)
        || !Number.isFinite(domainEnd)
        || domainEnd <= domainStart
    ) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(1, (position - domainStart) / (domainEnd - domainStart))
    );
}

export function shouldRenderBarLabelOverlay({
    showTimeline,
    disableOverlay,
    barLabelColor,
    whiteOverlayWidth,
}) {
    return (
        !showTimeline &&
        !disableOverlay &&
        barLabelColor === 'white' &&
        whiteOverlayWidth > 0
    );
}
