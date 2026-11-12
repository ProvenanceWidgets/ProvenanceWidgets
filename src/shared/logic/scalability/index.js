// Strategy entry points preserve the shared scalability API.
export * from "./strategies/clipping/index.js";
export * from "./strategies/smoothing/index.js";
export * from "./strategies/zoomin/index.js";

// Shared defaults and strategy-independent aggregate windowing.
export {
    DEFAULT_TEMPORAL_INTERACTION_THRESHOLD,
    DEFAULT_TEMPORAL_TIME_THRESHOLD,
    DEFAULT_TEMPORAL_ZOOM_MODES,
    DEFAULT_TEMPORAL_ZOOM_TRIGGER_TYPE,
    DEFAULT_TEMPORAL_ZOOM_VISIBILITY,
} from "./shared/defaults.js";
export { resolveSliderAggregateWindowConfig } from "./windowing/config.js";
export {
    getSliderAggregateWindowLayout,
    sliderWindowStartToScrollLeft,
    sliderWindowScrollLeftToStart,
} from "./windowing/sliderAggregateWindow.js";
