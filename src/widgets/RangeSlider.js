import { Slider as Slider_ } from "primereact/slider/slider.esm.js";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { interpolateOranges } from "d3";
import {
    RangedProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import useElementSize from "../shared/hooks/useElementSize.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import Chart from "./Chart.js";
import SliderTickMarks from "../shared/components/SliderTickMarks.js";
import RangeSliderBars from "../shared/components/RangeSliderBars.js";
import { shouldCommitSliderChange } from "../shared/logic/sliderInteraction.js";
import {
    callRangeSliderCallbacks,
    getControlledRangeSliderValue,
    getInitialRangeSliderValue,
    normalizeRangeSliderValue,
    rangeSliderValueKey,
    rangeSliderValuesEqual,
} from "../shared/logic/rangeSliderValue.js";
import {
    formatAggregateTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";
import { getSliderViewPanelLayout } from "../shared/logic/sliderViewLayout.js";

/**
 * The current React `value={[low, high]}` API and the split-value
 * `value={low} highValue={high} options={...}` API are both supported.
 * Handles update during a drag, while provenance is recorded once when the
 * drag ends.
 */
const Rangeslider = (props) => {
    const options = props.options ?? {};
    const min = props.min ?? options.floor ?? 0;
    const max = props.max ?? options.ceil ?? 100;
    const step = props.step ?? options.step ?? 1;
    const showTicks = props.showTicks ?? options.showTicks ?? false;
    const tickStep = props.tickStep ?? options.tickStep ?? step;
    const ticksArray = props.ticksArray ?? options.ticksArray;
    const trackBottom = showTicks ? 24 : 0;
    const recordControlledExternalChanges =
        props.recordExternalChanges ?? true;
    const initialValueRef = useRef(
        getInitialRangeSliderValue(props, min, max)
    );
    const tooltipLabel =
        props.dataLabel ?? props["data-label"] ?? props.id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled(props);
    const tooltipId = useProvenanceTooltip();
    const [revertedValue] = useRevertedValue(props.id);
    const {
        registerWidget,
        notifyWidget,
    } = useWidgetRegistry();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [measureContainer, { width: containerWidth }] =
        useElementSize();
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new RangedProvenance(min, max);
            strategy.tooltipLabel = tooltipLabel;
            strategy.tooltipIndexOffset = 1;
            return strategy;
        },
        [min, max, tooltipLabel]
    );

    const {
        currentValue,
        strategy,
        hasProvenance,
        provenance: serializedProvenance,
        mode: provenanceMode,
        recordInteraction,
        recordExternalChange,
        restoreValue,
    } = useProvenanceController({
        id: props.id,
        widgetType: "range-slider",
        // Keep the hook input stable and distinguish committed callback
        // echoes from genuine external controlled-value changes below.
        value: initialValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
        valuesEqual: rangeSliderValuesEqual,
    });
    const [displayValue, setDisplayValue] = useState(currentValue);
    const viewPanelLayout = getSliderViewPanelLayout({
        temporalBrush,
        entryCount: strategy?.detailedData?.size ?? 0,
    });
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;
    const currentValueKey = rangeSliderValueKey(currentValue);
    const serializedProvenanceRef = useRef(serializedProvenance);
    serializedProvenanceRef.current = serializedProvenance;
    const emittedValueKeyRef = useRef(null);
    const controlledValue = getControlledRangeSliderValue(
        props,
        min,
        max
    );
    const controlledValueKey = rangeSliderValueKey(controlledValue);
    const previousControlledKeyRef = useRef(controlledValueKey);
    const previousProvenanceRef = useRef(props.provenance);

    useEffect(() => {
        const normalized = normalizeRangeSliderValue(
            currentValue,
            min,
            max
        );
        if (normalized) setDisplayValue(normalized);
        // Controller snapshots defensively clone range arrays. Depending on
        // the array reference here would therefore reset the handles to the
        // last committed value after every drag render. A structural key only
        // synchronizes when the committed range actually changes.
    }, [currentValueKey, min, max]);

    // A controlled parent echoes the released value back through props.
    // Do not record that echo twice; genuinely new parent values remain
    // external provenance interactions.
    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValueKey !== previousControlledKeyRef.current;

        if (controlledValue && controlledChanged) {
            setDisplayValue(controlledValue);
            if (
                emittedValueKeyRef.current === controlledValueKey ||
                provenanceChanged
            ) {
                emittedValueKeyRef.current = null;
            } else if (recordControlledExternalChanges) {
                recordExternalChange(controlledValue, {
                    caller: "controlled-value",
                });
            }
        }

        previousControlledKeyRef.current = controlledValueKey;
        previousProvenanceRef.current = props.provenance;
    }, [
        controlledValueKey,
        props.provenance,
        recordExternalChange,
        recordControlledExternalChanges,
        min,
        max,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            const normalized = normalizeRangeSliderValue(
                nextValue,
                min,
                max
            );
            if (!normalized) return false;

            const changed = restoreValue(normalized, {
                caller: source,
            });
            setDisplayValue(normalized);
            callRangeSliderCallbacks(
                propsRef.current,
                normalized,
                { source }
            );
            return changed;
        },
        [restoreValue, min, max]
    );

    const setContainerRef = useCallback(node => {
        elementRef.current = node;
        measureContainer(node);
    }, [measureContainer]);

    useEffect(() => {
        if (!strategy) return undefined;

        strategy.hasUserInteracted = hasProvenance;
        strategy.tooltipLabel = tooltipLabel;
        strategy.tooltipIndexOffset = 1;
        notifyWidget(props.id);
        return undefined;
    }, [
        strategy,
        hasProvenance,
        tooltipLabel,
        props.id,
        notifyWidget,
    ]);

    useEffect(() => {
        if (!strategy) return undefined;

        const registration = {
            id: props.id,
            type: "range-slider",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => currentValueRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            focus: () => {
                const element = elementRef.current;
                element?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                (
                    element?.querySelector?.('[role="slider"]') ??
                    element
                )?.focus?.();
            },
        };
        const unregister = registerWidget(registration);
        const refreshRegistry = () => notifyWidget(props.id);
        strategy.addEventListener(
            PROVENANCE_INSERT_EVENT,
            refreshRegistry
        );

        return () => {
            strategy.removeEventListener(
                PROVENANCE_INSERT_EVENT,
                refreshRegistry
            );
            unregister();
        };
    }, [
        strategy,
        props.id,
        applyRegisteredValue,
        registerWidget,
        notifyWidget,
        visualize,
        provenanceMode,
    ]);

    useEffect(() => {
        const handleToggle = event => {
            if (event.detail?.target !== props.id) return;
            setDropdownVisible(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
    }, [props.id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const commitValue = (nextValue, event) => {
        emittedValueKeyRef.current = rangeSliderValueKey(nextValue);
        recordInteraction(nextValue);
        setDisplayValue(nextValue);
        callRangeSliderCallbacks(propsRef.current, nextValue, event);
    };

    const handleChange = event => {
        const nextValue = normalizeRangeSliderValue(
            event.value,
            min,
            max
        );
        if (!nextValue) return;

        setDisplayValue(nextValue);
        if (shouldCommitSliderChange(event)) {
            commitValue(nextValue, event);
        }
    };

    const handleSlideEnd = event => {
        const nextValue = normalizeRangeSliderValue(
            event.value ?? displayValue,
            min,
            max
        );
        if (!nextValue) return;

        commitValue(nextValue, event);
    };

    return (
        <div
            ref={setContainerRef}
            data-label={tooltipLabel}
            data-widget-id={props.id}
            style={{
                marginTop: "1rem",
                width: "100%",
                position: "relative",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: showTicks ? "76px" : "52px",
                }}
            >
                {visualize &&
                    containerWidth > 0 &&
                    hasProvenance && (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                bottom: `${trackBottom + 2}px`,
                                lineHeight: 0,
                            }}
                        >
                            <RangeSliderBars
                                provenance={strategy}
                                colorScheme={interpolateOranges}
                                min={min}
                                max={max}
                                width={containerWidth}
                                height={50}
                                onRangeSelect={applyRegisteredValue}
                                getBarProps={(value, record) =>
                                    getTooltipAnchorProps(
                                        tooltipId,
                                        formatAggregateTooltip({
                                            label: tooltipLabel,
                                            value,
                                            record,
                                            kind: "range",
                                            sequenceIndex: Math.max(
                                                0,
                                                (record.index ?? 1) - 1
                                            ),
                                            sequenceTotal: Math.max(
                                                0,
                                                (
                                                    strategy.detailedData
                                                        ?.size ?? 1
                                                ) - 1
                                            ),
                                        })
                                    )
                                }
                            />
                        </div>
                    )}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: trackBottom,
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    <Slider_
                        {...props.sliderProps}
                        range
                        aria-label={
                            props["aria-label"] ?? tooltipLabel
                        }
                        style={{
                            width: "100%",
                            ...props.sliderProps?.style,
                        }}
                        step={step}
                        max={max}
                        min={min}
                        value={displayValue}
                        onChange={handleChange}
                        onSlideEnd={handleSlideEnd}
                    />
                </div>
                {showTicks && (
                    <SliderTickMarks
                        min={min}
                        max={max}
                        step={step}
                        tickStep={tickStep}
                        ticksArray={ticksArray}
                        values={displayValue}
                        formatValue={options.translate}
                        trackBottom={trackBottom}
                    />
                )}
            </div>

            {visualize && isDropdownVisible && (
                <div
                     style={{
                         position: "absolute",
                         top: "100%",
                         left: `${viewPanelLayout.panelOffset}px`,
                         width:
                             `calc(100% + ${viewPanelLayout.panelExtraWidth}px)`,
                         border: "1px solid #ccc",
                         boxSizing: "border-box",
                        backgroundColor: "#fff",
                        zIndex: 1000,
                        borderRadius: "4px",
                        marginTop: "5px",
                        boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), " +
                            "0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                >
                    <Chart
                        target={props.id}
                        theme="light"
                        provenance={serializedProvenance}
                        mode={provenanceMode}
                        temporalBrush={temporalBrush}
                    />
                </div>
            )}
        </div>
    );
};

export default Rangeslider;
