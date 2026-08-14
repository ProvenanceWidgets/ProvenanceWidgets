import { InputText as InputText_ } from "primereact/inputtext/inputtext.esm.js";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { interpolateOranges } from "d3";
import {
    TextProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import {
    getContrastColor,
    getScentColor,
} from "../shared/logic/barAppearance.js";
import Chart from "./Chart.js";
import {
    callInputTextCallbacks,
    getControlledInputTextValue,
    getInitialInputTextValue,
    getInputTextEventValue,
    normalizeInputTextValue,
} from "../shared/logic/inputTextValue.js";
import {
    formatAggregateTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";

/**
 * Typing updates the input immediately. Pressing Enter, choosing an Aggregate
 * suggestion, or restoring Temporal history commits one provenance record.
 * Repeating the same search remains a valid interaction and increases its
 * Aggregate frequency.
 */
const InputText = (props) => {
    const { id, placeholder } = props;
    const initialValueRef = useRef(getInitialInputTextValue(props));
    const tooltipLabel =
        props.dataLabel ?? props["data-label"] ?? id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled(props);
    const tooltip = useProvenanceTooltip();
    const [revertedValue] = useRevertedValue(id);
    const {
        registerWidget,
        notifyWidget,
    } = useWidgetRegistry();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const elementRef = useRef(null);
    const nativeInputRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new TextProvenance();
            strategy.tooltipLabel = tooltipLabel;
            strategy.tooltipIndexOffset = 1;
            return strategy;
        },
        [tooltipLabel]
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
        id,
        widgetType: "input-text",
        // Keep the initial value stable so ordinary controlled typing is not
        // misclassified as an external provenance interaction.
        value: initialValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
        // Searching the same text twice is meaningful for frequency.
        valuesEqual: () => false,
    });
    const [text, setText] = useState(currentValue ?? "");
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;
    const serializedProvenanceRef = useRef(serializedProvenance);
    serializedProvenanceRef.current = serializedProvenance;
    const emittedValueRef = useRef(null);
    const controlledValue = getControlledInputTextValue(props);
    const previousControlledValueRef = useRef(controlledValue);
    const previousProvenanceRef = useRef(props.provenance);
    const historyVersion = serializedProvenance.data
        .map(record => record.timestamp)
        .join("|");

    useEffect(() => {
        if (currentValue === undefined) return;
        setText(String(currentValue));
    }, [currentValue]);

    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValue !== previousControlledValueRef.current;

        if (controlledValue !== undefined && controlledChanged) {
            setText(controlledValue);
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
    }, [
        controlledValue,
        props.provenance,
        recordExternalChange,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            const normalized = normalizeInputTextValue(nextValue);
            if (normalized === undefined) return false;

            const changed = restoreValue(normalized, {
                caller: source,
            });
            emittedValueRef.current = normalized;
            setText(normalized);
            setShowSuggestions(false);
            tooltip?.hide?.();
            callInputTextCallbacks(
                propsRef.current,
                normalized,
                { source }
            );
            return changed;
        },
        [restoreValue, tooltip]
    );

    useEffect(() => {
        if (!strategy) return undefined;

        strategy.hasUserInteracted = hasProvenance;
        strategy.tooltipLabel = tooltipLabel;
        strategy.tooltipIndexOffset = 1;
        notifyWidget(id);
        return undefined;
    }, [
        strategy,
        hasProvenance,
        tooltipLabel,
        id,
        notifyWidget,
    ]);

    useEffect(() => {
        if (!strategy) return undefined;

        const registration = {
            id,
            type: "input-text",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => currentValueRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            focus: () => {
                elementRef.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                nativeInputRef.current?.focus?.();
            },
        };
        const unregister = registerWidget(registration);
        const refreshRegistry = () => notifyWidget(id);
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
        id,
        applyRegisteredValue,
        registerWidget,
        notifyWidget,
        visualize,
        provenanceMode,
    ]);

    useEffect(() => {
        const handleToggle = event => {
            if (event.detail?.target !== id) return;
            setDropdownVisible(Boolean(event.detail.open));
            if (event.detail.open) setShowSuggestions(false);
        };
        window.addEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
    }, [id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const suggestions = useMemo(() => {
        if (!strategy?.aggregateData || !hasProvenance) return [];

        const query = text.toLocaleLowerCase();
        const entries = [...strategy.aggregateData.entries()]
            .filter(([value]) => (
                value !== "" &&
                value !== undefined &&
                value !== null
            ))
            .filter(([value]) => (
                !query ||
                String(value).toLocaleLowerCase().includes(query)
            ))
            .sort(([, left], [, right]) => (
                new Date(right.time).getTime() -
                new Date(left.time).getTime()
            ));
        const maxCount = Math.max(
            1,
            ...entries.map(([, record]) => record.count ?? 0)
        );

        return entries.map(([value, record]) => ({
            value: String(value),
            record,
            width:
                `${((record.count ?? 0) / maxCount) * 100}%`,
            color:
                getScentColor(
                    value,
                    strategy,
                    interpolateOranges
                ) || "#f4bd88",
        }));
    }, [strategy, text, historyVersion]);

    const commitValue = (
        value,
        event,
        caller = "enter"
    ) => {
        const normalized = normalizeInputTextValue(value);
        if (normalized === undefined) return false;

        const changed = recordInteraction(normalized, { caller });
        emittedValueRef.current = normalized;
        setText(normalized);
        // Typing is a preview; Enter or history selection exposes the change.
        callInputTextCallbacks(propsRef.current, normalized, event);
        return changed;
    };

    const handleInputChange = event => {
        const nextValue = String(event.target.value);
        setText(nextValue);
    };

    const handleKeyUp = event => {
        props.inputProps?.onKeyUp?.(event);
        props.onKeyUp?.(event);
        if (
            event.key !== "Enter" ||
            event.isComposing ||
            event.nativeEvent?.isComposing
        ) {
            return;
        }
        // Read the native input to avoid stale state when typing and Enter
        // happen in the same render frame.
        commitValue(
            getInputTextEventValue(event, text),
            event,
            "enter"
        );
        setShowSuggestions(true);
    };

    const selectSuggestion = (value, event) => {
        commitValue(value, event, "suggestion");
        setShowSuggestions(false);
        tooltip?.hide?.();
    };

    return (
        <div
            ref={elementRef}
            data-label={tooltipLabel}
            data-widget-id={id}
            data-provenance-open={
                isDropdownVisible ? "true" : "false"
            }
            style={{
                marginTop: "1rem",
                position: "relative",
            }}
            onBlur={event => {
                if (
                    event.currentTarget.contains(event.relatedTarget)
                ) {
                    return;
                }
                setShowSuggestions(false);
                tooltip?.hide?.();
            }}
        >
            <InputText_
                {...props.inputProps}
                ref={nativeInputRef}
                id={id}
                data-widget-id={id}
                aria-label={
                    props["aria-label"] ?? tooltipLabel
                }
                autoComplete={
                    props.inputProps?.autoComplete ?? "off"
                }
                placeholder={placeholder}
                onKeyUp={handleKeyUp}
                onChange={handleInputChange}
                onFocus={event => {
                    setShowSuggestions(true);
                    props.inputProps?.onFocus?.(event);
                    props.onFocus?.(event);
                }}
                value={text}
                style={{
                    width: "100%",
                    backgroundColor: "#fff",
                    borderColor: "#ced4da",
                    boxShadow: "0 0 0 1000px #fff inset",
                    outline: "none",
                    ...props.inputProps?.style,
                }}
            />

            {!isDropdownVisible &&
                showSuggestions &&
                suggestions.length > 0 && (
                    <div
                        role="listbox"
                        aria-label={
                            `${tooltipLabel} search history`
                        }
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: "100%",
                            zIndex: 1000,
                            marginTop: "2px",
                            border: "1px solid #ced4da",
                            borderRadius: "4px",
                            backgroundColor: "#fff",
                            boxShadow:
                                "0 4px 6px rgba(0, 0, 0, 0.12)",
                            overflow: "hidden",
                        }}
                    >
                        {suggestions.map(({
                            value,
                            record,
                            width,
                            color,
                        }) => {
                            const displayValue = value === ""
                                ? "<empty>"
                                : value;
                            const needsWhiteBarLabel =
                                visualize &&
                                getContrastColor(color) === "white" &&
                                Number.parseFloat(width) > 0;
                            const tooltipProps = visualize
                                ? getTooltipAnchorProps(
                                    tooltip,
                                    formatAggregateTooltip({
                                        label: tooltipLabel,
                                        value,
                                        record,
                                        kind: "input",
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
                                : {};

                            return (
                                <div
                                    key={value}
                                    {...tooltipProps}
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={text === value}
                                    onMouseDown={event => {
                                        event.preventDefault();
                                    }}
                                    onClick={event =>
                                        selectSuggestion(value, event)
                                    }
                                    onKeyDown={event => {
                                        if (
                                            event.key !== "Enter" &&
                                            event.key !== " "
                                        ) {
                                            return;
                                        }
                                        event.preventDefault();
                                        selectSuggestion(value, event);
                                    }}
                                    style={{
                                        ...tooltipProps.style,
                                        position: "relative",
                                        minHeight: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "6px 10px",
                                        overflow: "hidden",
                                        cursor: "pointer",
                                    }}
                                >
                                    {visualize && (
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                position: "absolute",
                                                inset: "0 auto 0 0",
                                                width,
                                                backgroundColor: color,
                                                border:
                                                    "1px solid " +
                                                    "rgba(0, 0, 0, 0.35)",
                                                pointerEvents: "none",
                                            }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            position: "relative",
                                            zIndex: 1,
                                            pointerEvents: "none",
                                            color: "black",
                                        }}
                                    >
                                        {displayValue}
                                    </span>
                                    {needsWhiteBarLabel && (
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                position: "absolute",
                                                inset: "0 auto 0 0",
                                                width,
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "6px 10px",
                                                overflow: "hidden",
                                                color: "white",
                                                whiteSpace: "nowrap",
                                                zIndex: 2,
                                                pointerEvents: "none",
                                            }}
                                        >
                                            {displayValue}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            {visualize && (
                <div
                    hidden={!isDropdownVisible}
                    data-provenance-temporal-panel={id}
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        border: "1px solid #ccc",
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
                        target={id}
                        theme="light"
                        provenance={serializedProvenance}
                        provenanceStrategy={strategy}
                        mode={provenanceMode}
                        temporalBrush={temporalBrush}
                    />
                </div>
            )}
        </div>
    );
};

export default InputText;
