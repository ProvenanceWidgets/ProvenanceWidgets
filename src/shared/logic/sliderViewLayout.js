const PANEL_BORDER_WIDTH = 1;
const CHART_PADDING = 15;
const PLOT_ENDPOINT_INSET = 6;
const TEMPORAL_BRUSH_WIDTH = 64;
const TEMPORAL_LABEL_WIDTH = 28;
const TEMPORAL_LABEL_GAP = 8;

export const hasVisibleTemporalBrush = ({
    temporalBrush,
    entryCount,
}) => temporalBrush === true && entryCount > 1;

/**
 * Expand a slider's temporal panel so the plot, rather than the panel box,
 * has exactly the same width and origin as the native slider track.
 */
export const getSliderViewPanelLayout = ({
    temporalBrush,
    entryCount,
}) => {
    const brushVisible = hasVisibleTemporalBrush({
        temporalBrush,
        entryCount,
    });
    const yAxisWidth = brushVisible
        ? TEMPORAL_BRUSH_WIDTH
        : TEMPORAL_LABEL_WIDTH + TEMPORAL_LABEL_GAP;
    const leftGutter =
        PANEL_BORDER_WIDTH +
        CHART_PADDING +
        yAxisWidth +
        PLOT_ENDPOINT_INSET;
    const rightGutter =
        PANEL_BORDER_WIDTH + CHART_PADDING + PLOT_ENDPOINT_INSET;

    return {
        brushVisible,
        leftGutter,
        rightGutter,
        panelOffset: -leftGutter,
        panelExtraWidth: leftGutter + rightGutter,
    };
};
