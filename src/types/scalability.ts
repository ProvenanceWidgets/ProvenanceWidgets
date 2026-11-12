export type ScalabilityStrategy =
  | "none"
  | "zoom_in"
  | "clipping"
  | "smoothing";

export type TemporalScalabilityTriggerType =
  | "interaction"
  | "time";

export type AggregateScalabilityTriggerType =
  | TemporalScalabilityTriggerType
  | "on_range_over";

export type TemporalZoomMode =
  | "interactions"
  | "values"
  | "interactions-values";

export type TemporalZoomVisibility =
  | "all-active"
  | "after-trigger"
  | "off";

export type TemporalZoomTriggerType = "interaction" | "time";

export interface ScalabilityThresholdTrigger<
  TType extends string = string,
> {
  type?: TType;
  threshold?: number;
}

export interface ScalabilityZoomTrigger<
  TType extends string = string,
> extends ScalabilityThresholdTrigger<TType> {
  /** Whether the zoom tool is visible before the threshold is reached. */
  tool_visible_before_trigger?: boolean;
  /** Whether zooming happens automatically at the threshold. */
  auto_zoom_on_trigger?: boolean;
}

export interface TemporalZoomInOptions {
  /** One or more interaction/value dimensions to use for temporal zooming. */
  modes?: TemporalZoomMode[];
  /** Whether zoom tools are always active, trigger-gated, or disabled. */
  visibility?: TemporalZoomVisibility;
  trigger?: ScalabilityThresholdTrigger<TemporalZoomTriggerType> & {
    /** Whether zooming happens automatically at the threshold. */
    auto_zoom?: boolean;
  };
}

export interface AggregateScalabilityZoomInOptions {
  trigger?: ScalabilityZoomTrigger<AggregateScalabilityTriggerType>;
}

/** Keeps a rolling threshold-sized display window; source provenance is preserved.
 * Omitted/invalid thresholds use max(1, floor(widgetWidth / 10)) after layout.
 */
export interface ScalabilityClippingOptions<
  TType extends string = TemporalScalabilityTriggerType,
> {
  /** Defaults to interaction; time uses recorded elapsed seconds. */
  trigger?: ScalabilityThresholdTrigger<TType>;
}

export type TemporalScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type AggregateScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type ScalabilitySmoothingTriggerType = "interaction" | "time";

export interface SavgolSmoothingOptions {
  /** Odd integer window size in grid samples >= 3; defaults to 5 (2*M+1).
   * A window larger than the sample count leaves the signal unchanged.
   */
  window_size?: number;
  /** Positive integer coefficient count (N+1); defaults to 3 (quadratic).
   * Highest polynomial power is degree-1. Requires degree < window_size;
   * invalid combinations leave the signal unchanged.
   */
  degree?: number;
}

export interface GaussianSmoothingOptions {
  /** Positive Gaussian standard deviation in data-domain units; defaults to 2. */
  sigma?: number;
  /** Positive support radius in standard deviations; defaults to 3.
   * The data-domain support radius is truncate * sigma.
   */
  truncate?: number;
}

export interface BsplineSmoothingOptions {
  /** Integer spline degree in [1, 5]; defaults to 3 (cubic). */
  degree?: number;
  /** Normalized smoothing strength in [0, 1]; defaults to 0.5.
   * Larger values mean stronger smoothing; not a library-specific residual bound.
   * Slider: 0 = unpenalized B-spline fit, 1 = least-squares line.
   */
  smoothing_factor?: number;
  /** Positive distance between interior knots in data-domain units; defaults to 10. */
  knot_spacing?: number;
}

export type ScalabilitySmoothingMethod =
  | {
      type: "savgol";
      options: SavgolSmoothingOptions;
    }
  | {
      type: "gaussian";
      options: GaussianSmoothingOptions;
    }
  | {
      type: "bspline";
      options: BsplineSmoothingOptions;
    };

/** Gaussian/B-spline distances use the component's documented data domain.
 * Savgol window_size counts numerical grid samples; degree is N+1.
 * Degree, truncate, and smoothing_factor are dimensionless.
 * Slider aggregate and temporal views implement all three methods with
 * view-specific data adapters. Temporal interaction mode uses record-order
 * units; temporal time mode uses elapsed seconds.
 */
export interface ScalabilitySmoothingOptions {
  /** Selection widgets: horizontal whole-track Gaussian standard deviation, in percent
   * of track width. Default 1.2; 0 disables blur. */
  blur_radius?: number;
  /** Selection timelines: blur radius on each side of a color boundary, as a
   * percentage of track width. Default 1.2; 0 disables blur. Capped at one
   * quarter of each adjacent segment to preserve solid colors and gaps. */
  boundary_radius?: number;
  /** Defaults to { type: "savgol", options: { window_size: 5, degree: 3 } }. */
  method?: ScalabilitySmoothingMethod;
  /** Defaults to interaction; threshold defaults to 50 interactions or 3600 seconds.
   * Both views count recorded interaction events, rather than aggregate item count.
   */
  trigger?: ScalabilityThresholdTrigger<ScalabilitySmoothingTriggerType>;
}

export interface ScalabilityWindowOptions {
  /** Slider: positive integer value span in domain units (independent of step).
   * Defaults to max - min; invalid/noninteger sizes show the full domain.
   * Windowing requires integer min and max.
   * Other widgets: number of aggregate items; windowing is not implemented yet.
   */
  window_size?: number;
  /** Slider: integer absolute value at the left edge, defaulting to min and clamped
   * to [min, max - window_size]. Initializes scrolling and repositions when
   * changed; user scrolling snaps to integer starts without recording history.
   * Other widgets: zero-based item index; windowing is not implemented yet.
   */
  window_start?: number;
}

export interface TemporalViewScalability {
  /** Defaults to zoom_in; none disables zoom, clipping, and smoothing. */
  strategy?: ScalabilityStrategy;
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: TemporalScalabilityClippingOptions;
  smoothing_options?: ScalabilitySmoothingOptions;
}

export interface AggregateViewScalability {
  /** Defaults to none; aggregate zoom_in is not implemented. */
  strategy?: ScalabilityStrategy;
  zoom_in_options?: AggregateScalabilityZoomInOptions;
  clipping_options?: AggregateScalabilityClippingOptions;
  smoothing_options?: ScalabilitySmoothingOptions;
  /** Applies to aggregate_view regardless of the selected strategy. */
  window_options?: ScalabilityWindowOptions;
}

export interface ScalabilityOptions {
  temporal_view?: TemporalViewScalability;
  /** Configured independently from temporal_view; omitted views keep their default strategy. */
  aggregate_view?: AggregateViewScalability;
}

/** Generic prop-object name for consumers that expose scalability directly. */
export type ScalabilityProps = ScalabilityOptions;

/** Alias used by widget-specific APIs such as SingleSlider. */
export type SingleSliderScalability = ScalabilityOptions;

/** CheckboxGroup uses temporal zoom_in with modes: ["interactions"]. */
export type CheckboxScalability = ScalabilityOptions;

/** Checkbox defaults to manual drag-to-zoom, using the shared slider trigger defaults. */
export const DEFAULT_CHECKBOX_SCALABILITY: CheckboxScalability = {
  temporal_view: {
    strategy: "zoom_in",
    zoom_in_options: {
      modes: ["interactions"],
      visibility: "all-active",
      trigger: {
        type: "interaction",
        threshold: 50,
        auto_zoom: false,
      },
    },
  },
};
