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
    NumericProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import useElementSize from "../shared/hooks/useElementSize.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import { generateRange } from "../shared/logic/valueMath.js";
import Chart from "./Chart.js";
import SliderTickMarks from "../shared/components/SliderTickMarks.js";
import { shouldCommitSliderChange } from "../shared/logic/sliderInteraction.js";
import SingleSliderBars from "../shared/components/SingleSliderBars.js";
import {
    formatAggregateTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";
import { getSliderViewPanelLayout } from "../shared/logic/sliderViewLayout.js";

const callValueCallbacks = (props, value, event) => {
    const callbacks = new Set([
        props.onChange,
        props.onSelectedChange,
        props.selectedChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);
    callbacks.forEach(callback => callback(value, event));
};

/**
 * Current React callers can keep using `min`, `max`, `step`, `value`, and
 * `onChange`. The compatibility `options` object and provenance contract
 * are also supported.
 */
const Singleslider = (props) => {
    const options = props.options ?? {};
    const min = props.min ?? options.floor ?? 0;
    const max = props.max ?? options.ceil ?? 100;
    const step = props.step ?? options.step ?? 1;
    const showTicks = props.showTicks ?? options.showTicks ?? false;
    const tickStep = props.tickStep ?? options.tickStep ?? step;
    const ticksArray = props.ticksArray ?? options.ticksArray;
    const trackBottom = showTicks ? 24 : 0;
    const initialValueRef = useRef(
        props.value ?? props.defaultValue ?? min
    );
    const tooltipLabel =
        props.dataLabel ?? props["data-label"] ?? props.id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled(props);
    const tooltip = useProvenanceTooltip();
    const [revertedValue] = useRevertedValue(props.id);
    const {
        registerWidget,
        notifyWidget,
    } = useWidgetRegistry();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [measureContainer, { width: containerWidth }] = useElementSize();
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const barKeys = useMemo(
        () => generateRange(min, max + step, step),
        [min, max, step]
    );

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new NumericProvenance(min, max);
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
        widgetType: "single-slider",
        value: initialValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
    });
    // Display value tracks the slider thumb position during a drag.
    // It follows intermediate onChange steps, while currentValue (from the
    // controller) only updates when provenance is actually committed.
    const [displayValue, setDisplayValue] = useState(currentValue);
    const viewPanelLayout = getSliderViewPanelLayout({
        temporalBrush,
        entryCount: strategy?.detailedData?.size ?? 0,
    });
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;
    const serializedProvenanceRef = useRef(serializedProvenance);
    serializedProvenanceRef.current = serializedProvenance;
    const emittedValueRef = useRef(null);
    const controlledValue = props.value;
    const previousControlledValueRef = useRef(controlledValue);
    const previousProvenanceRef = useRef(props.provenance);

    // Controlled parent echoes each intermediate drag value back through props.
    // Filter out parent echoes during a drag so they do not record extra
    // provenance interactions; record genuine external changes from outside.
    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValue !== previousControlledValueRef.current;

        if (controlledValue !== undefined && controlledChanged) {
            setDisplayValue(controlledValue);
            if (
                emittedValueRef.current === controlledValue ||
                provenanceChanged
            ) {
                emittedValueRef.current = null;
            } else {
                recordExternalChange(controlledValue, {
                    caller: "controlled-value",
                });
            }
        }

        previousControlledValueRef.current = controlledValue;
        previousProvenanceRef.current = props.provenance;
    }, [controlledValue, props.provenance, recordExternalChange]);

    // Sync display value when the committed value changes (provenance
    // record, restore, external change, or provenance replacement).
    useEffect(() => {
        if (currentValue !== undefined) setDisplayValue(currentValue);
    }, [currentValue]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            const changed = restoreValue(nextValue, {
                caller: source,
            });
            callValueCallbacks(propsRef.current, nextValue, { source });
            return changed;
        },
        [restoreValue]
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
            type: "single-slider",
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

    // Live pointer drag is only a preview. Keep both the controlled value and
    // provenance untouched until PrimeReact reports onSlideEnd. Keyboard
    // changes have no onSlideEnd counterpart, so each key step commits here.
    const handleChange = event => {
        const nextValue = Number(event.value);
        if (!Number.isFinite(nextValue)) return;

        setDisplayValue(nextValue);
        if (!shouldCommitSliderChange(event)) return;

        emittedValueRef.current = nextValue;
        recordInteraction(nextValue);
        callValueCallbacks(propsRef.current, nextValue, event);
    };

    // Drag end: commit the final value into provenance history.
    const handleSlideEnd = event => {
        const nextValue = Number(event.value ?? displayValue);
        if (!Number.isFinite(nextValue)) return;

        emittedValueRef.current = nextValue;
        recordInteraction(nextValue);
        callValueCallbacks(propsRef.current, nextValue, event);
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
                {visualize && containerWidth > 0 && hasProvenance && (
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            bottom: `${trackBottom + 2}px`,
                            width: containerWidth,
                            height: 50,
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                            }}
                        >
                            <SingleSliderBars
                                provenance={strategy}
                                orientationScheme={interpolateOranges}
                                barKeys={barKeys}
                                min={min}
                                max={max}
                                width={containerWidth}
                                height={50}
                            />
                        </div>
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                pointerEvents: "none",
                            }}
                        >
                            {barKeys.map(key => {
                                const record = strategy.aggregateData?.get(key);
                                if (!record) return null;
                                const centerPercent = max === min
                                    ? 50
                                    : (
                                        (Number(key) - min) /
                                        (max - min)
                                    ) * 100;
                                const halfSlotPercent = barKeys.length > 1
                                    ? 50 / (barKeys.length - 1)
                                    : 50;
                                const hitLeft = Math.max(
                                    0,
                                    centerPercent - halfSlotPercent
                                );
                                const hitRight = Math.min(
                                    100,
                                    centerPercent + halfSlotPercent
                                );

                                const tooltipProps = getTooltipAnchorProps(
                                    tooltip,
                                    formatAggregateTooltip({
                                        label: tooltipLabel,
                                        value: key,
                                        record,
                                        kind: "slider",
                                        sequenceIndex: Math.max(
                                            0,
                                            (record.index ?? 1) - 1
                                        ),
                                        sequenceTotal: Math.max(
                                            0,
                                            (strategy.detailedData?.size ?? 1) - 1
                                        ),
                                    })
                                );

                                return (
                                    <div
                                        key={key}
                                        {...tooltipProps}
                                        role="button"
                                        tabIndex={0}
                                        data-provenance-aggregate-value={key}
                                        aria-label={`Restore ${tooltipLabel} to ${key}`}
                                        onClick={() =>
                                            applyRegisteredValue(
                                                Number(key),
                                                "history"
                                            )
                                        }
                                        onKeyDown={event => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                applyRegisteredValue(
                                                    Number(key),
                                                    "history"
                                                );
                                            }
                                        }}
                                        style={{
                                            ...tooltipProps.style,
                                            position: "absolute",
                                            left: `${hitLeft}%`,
                                            width: `${hitRight - hitLeft}%`,
                                            top: 0,
                                            bottom: 0,
                                            background: "transparent",
                                            cursor: "pointer",
                                        }}
                                    />
                                );
                            })}
                        </div>
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
                        aria-label={props["aria-label"] ?? tooltipLabel}
                        style={{ width: "100%", ...props.sliderProps?.style }}
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

export default Singleslider;
