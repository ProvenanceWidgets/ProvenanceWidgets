export function getSliderAggregateWindowLayout({ config, width }) {
    const viewportWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
    const pixelsPerValue = config.size > 0 ? viewportWidth / config.size : 0;
    const contentWidth = config.enabled
        ? viewportWidth * ((config.max - config.min) / config.size)
        : viewportWidth;

    return {
        ...config,
        viewportWidth,
        contentWidth,
        pixelsPerValue,
        maxScrollLeft: Math.max(0, contentWidth - viewportWidth),
    };
}

export function sliderWindowStartToScrollLeft(window, start) {
    const value = Number.isFinite(start) ? Math.round(start) : window.min;
    const clamped = Math.min(window.maxStart, Math.max(window.min, value));
    return Math.min(window.maxScrollLeft,
        Math.max(0, (clamped - window.min) * window.pixelsPerValue));
}

export function sliderWindowScrollLeftToStart(window, scrollLeft) {
    if (!(window.pixelsPerValue > 0)) return window.start;
    const offset = Number.isFinite(scrollLeft) ? scrollLeft : 0;
    const clamped = Math.min(window.maxScrollLeft, Math.max(0, offset));
    return Math.min(window.maxStart,
        Math.max(window.min, Math.round(window.min + clamped / window.pixelsPerValue)));
}
