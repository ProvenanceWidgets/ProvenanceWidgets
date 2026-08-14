import {
    Children,
    isValidElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    SelectionProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import Checkbox from "./Checkbox.js";
import CheckboxGroupContext, {
    useCheckboxGroup,
} from "../shared/contexts/CheckboxGroupContext.js";
import {
    callCheckboxGroupCallbacks,
    checkboxGroupValueKey,
    getCheckboxGroupCaller,
    getCheckboxKeysAtTimelinePoint,
    getCheckboxOptionLabel,
    getCheckboxOptionValue,
    getControlledCheckboxGroupValue,
    getInitialCheckboxGroupValue,
    isResolvableCheckboxGroupValue,
    resolveCheckboxGroupValue,
    restoreCheckboxGroupTemporalValue,
} from "../shared/logic/checkboxGroupValue.js";
import {
    getSelectionTimeDomain,
    normalizeSelectionBrushRange,
} from "../shared/logic/selectionTimeline.js";
import { shouldCommitSliderChange } from "../shared/logic/sliderInteraction.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";
import TemporalRangeSlider from "../shared/components/TemporalRangeSlider.js";

export { useCheckboxGroup };

const getChildValues = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .map(child => child.props.value ?? child.props.label)
        .filter(value => value !== undefined);

const getCheckedChildValues = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .filter(child =>
            child.props.checked === true ||
            child.props.defaultChecked === true
        )
        .map(child => child.props.value ?? child.props.label)
        .filter(value => value !== undefined);

const optionHasField = (options, field) =>
    typeof field === "string" &&
    options.some(option =>
        option !== null &&
        typeof option === "object" &&
        Object.prototype.hasOwnProperty.call(option, field)
    );

/**
 * Every interaction records the complete selected key array. This is
 * required for simultaneous changes, imported provenance, and restoring all
 * options active at a clicked Temporal position.
 */
const CheckboxGroup = (props) => {
    const {
        id,
        data,
        options,
        children,
        name,
        dataLabel,
        "data-label": legacyDataLabel,
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
        checkboxProps = {},
        style,
        className,
        styleClass,
        ...groupProps
    } = props;
    const optionData = data ?? options ?? [];
    const usesData =
        Array.isArray(optionData) && optionData.length > 0;
    const childValues = useMemo(
        () => getChildValues(children),
        [children]
    );
    const checkedChildValues = useMemo(
        () => getCheckedChildValues(children),
        [children]
    );
    const availableOptions = usesData
        ? optionData
        : childValues;
    const tooltipLabel = dataLabel ?? legacyDataLabel ?? id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled({
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
    });
    const legacyValueField =
        usesData &&
        !props.optionValue &&
        !props.valueField &&
        optionHasField(optionData, props.value)
            ? props.value
            : undefined;
    const legacyLabelField =
        usesData &&
        !props.optionLabel &&
        optionHasField(optionData, props.label)
            ? props.label
            : undefined;
    const config = useMemo(
        () => ({
            dataKey: props.dataKey,
            optionLabel:
                props.optionLabel ?? legacyLabelField,
            optionValue:
                props.optionValue ??
                props.valueField ??
                legacyValueField,
        }),
        [
            props.dataKey,
            props.optionLabel,
            props.optionValue,
            props.valueField,
            legacyLabelField,
            legacyValueField,
        ]
    );
    const contractProps = legacyValueField
        ? { ...props, value: undefined }
        : props;
    const initialValueRef = useRef(
        getInitialCheckboxGroupValue(
            contractProps,
            availableOptions,
            config,
            checkedChildValues
        )
    );
    const [revertedValue] = useRevertedValue(id);
    const {
        registerWidget,
        notifyWidget,
        restoreWidgetValue,
    } = useWidgetRegistry();
    const [showTimeline, setShowTimeline] = useState(false);
    const [brushRange, setBrushRange] = useState([0, 100]);
    const [brushDisplayRange, setBrushDisplayRange] =
        useState([0, 100]);
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    const availableOptionsRef = useRef(availableOptions);
    const configRef = useRef(config);
    const checkboxRegistrationsRef = useRef(new Map());
    propsRef.current = props;
    availableOptionsRef.current = availableOptions;
    configRef.current = config;

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new SelectionProvenance();
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
        widgetType: "checkbox-group",
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
    const [selection, setSelection] = useState(
        () => Array.isArray(currentValue) ? currentValue : []
    );
    const currentValueRef = useRef(currentValue);
    const selectionRef = useRef(selection);
    const serializedProvenanceRef = useRef(serializedProvenance);
    currentValueRef.current = currentValue;
    selectionRef.current = selection;
    serializedProvenanceRef.current = serializedProvenance;
    const currentValueKey = checkboxGroupValueKey(currentValue);
    const historyVersion = serializedProvenance.data
        .map(record => record.timestamp)
        .join("|");
    const timeDomain = useMemo(
        () => getSelectionTimeDomain(serializedProvenance.data),
        [historyVersion]
    );

    useEffect(() => {
        const restored = resolveCheckboxGroupValue(
            availableOptions,
            currentValue,
            config
        );
        selectionRef.current = restored;
        setSelection(restored);
    }, [
        currentValueKey,
        availableOptions,
        config,
    ]);

    const controlledSelection =
        getControlledCheckboxGroupValue(
            contractProps,
            availableOptions,
            config
        );
    const controlledPresent =
        controlledSelection !== undefined;
    const controlledValueKey = controlledPresent
        ? checkboxGroupValueKey(controlledSelection)
        : "__uncontrolled__";
    const previousControlledKeyRef =
        useRef(controlledValueKey);
    const previousProvenanceRef = useRef(props.provenance);
    const emittedValueKeyRef = useRef(null);

    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValueKey !==
            previousControlledKeyRef.current;

        if (controlledPresent && controlledChanged) {
            selectionRef.current = controlledSelection;
            setSelection(controlledSelection);
            if (
                emittedValueKeyRef.current === controlledValueKey ||
                provenanceChanged
            ) {
                emittedValueKeyRef.current = null;
            } else {
                recordExternalChange(controlledSelection, {
                    caller: getCheckboxGroupCaller(
                        currentValueRef.current,
                        controlledSelection
                    ),
                });
            }
        }
        previousControlledKeyRef.current = controlledValueKey;
        previousProvenanceRef.current = props.provenance;
    }, [
        controlledPresent,
        controlledSelection,
        controlledValueKey,
        props.provenance,
        recordExternalChange,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            if (
                !isResolvableCheckboxGroupValue(
                    nextValue,
                    availableOptionsRef.current,
                    configRef.current
                )
            ) {
                return false;
            }
            const restored = resolveCheckboxGroupValue(
                availableOptionsRef.current,
                nextValue,
                configRef.current
            );
            const changed = restoreValue(restored, {
                caller: getCheckboxGroupCaller(
                    currentValueRef.current,
                    restored
                ),
            });
            emittedValueKeyRef.current =
                checkboxGroupValueKey(restored);
            selectionRef.current = restored;
            setSelection(restored);
            callCheckboxGroupCallbacks(
                propsRef.current,
                restored,
                { source }
            );
            return changed;
        },
        [restoreValue]
    );

    const setCheckboxValue = useCallback(
        (value, checked, event) => {
            const nextCandidate = checked
                ? [...selectionRef.current, value]
                : selectionRef.current.filter(
                    selected =>
                        !Object.is(selected, value) &&
                        String(selected) !== String(value)
                );
            const nextValue = resolveCheckboxGroupValue(
                availableOptionsRef.current,
                nextCandidate,
                configRef.current
            );
            if (
                checkboxGroupValueKey(nextValue) ===
                checkboxGroupValueKey(selectionRef.current)
            ) {
                return false;
            }
            emittedValueKeyRef.current =
                checkboxGroupValueKey(nextValue);
            recordInteraction(nextValue, {
                caller: value,
            });
            selectionRef.current = nextValue;
            setSelection(nextValue);
            callCheckboxGroupCallbacks(
                propsRef.current,
                nextValue,
                event
            );
            return true;
        },
        [recordInteraction]
    );

    const registerCheckbox = useCallback((registration) => {
        const key = registration.value;
        checkboxRegistrationsRef.current.set(key, registration);
        return () => {
            if (
                checkboxRegistrationsRef.current.get(key) ===
                registration
            ) {
                checkboxRegistrationsRef.current.delete(key);
            }
        };
    }, []);

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
            type: "checkbox-group",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => selectionRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            rendersOwnTemporalHeader: true,
            focus: () => {
                elementRef.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                elementRef.current
                    ?.querySelector?.('input[type="checkbox"]')
                    ?.focus?.();
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
            setShowTimeline(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
    }, [id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const restoreTemporalAtContext = useCallback(
        context => {
            const keys = getCheckboxKeysAtTimelinePoint({
                provenance: strategy,
                point:
                    provenanceMode === "interaction" &&
                    context?.point !== undefined
                        ? Number(context.point) + 1
                        : context?.point,
                mode: provenanceMode,
            });
            return restoreCheckboxGroupTemporalValue({
                restoreWidgetValue,
                target: id,
                value: keys,
            });
        },
        [
            strategy,
            provenanceMode,
            restoreWidgetValue,
            id,
        ]
    );

    const commitBrushRange = range => {
        setBrushRange(range);
        setBrushDisplayRange(range);
        window.dispatchEvent(new CustomEvent(
            "provenance-widgets",
            {
                detail: {
                    id,
                    widget: "checkbox-group",
                    mode: provenanceMode,
                    interaction: "brush-end",
                    data: { selection: range },
                },
            }
        ));
    };

    const handleBrushChange = event => {
        const range = normalizeSelectionBrushRange(event.value);
        setBrushDisplayRange(range);
        if (shouldCommitSliderChange(event)) {
            commitBrushRange(range);
        }
    };

    const handleBrushEnd = event => {
        const range = normalizeSelectionBrushRange(
            event.value ?? brushDisplayRange
        );
        commitBrushRange(range);
    };

    const renderedChildren = usesData
        ? optionData.map((option, index) => {
            const value = getCheckboxOptionValue(option, config);
            const label = getCheckboxOptionLabel(option, config);
            const optionProps =
                option && typeof option === "object"
                    ? option
                    : {};
            const legacyName =
                typeof props.name === "string"
                    ? optionProps[props.name]
                    : undefined;
            const legacyInputId =
                typeof props.inputId === "string"
                    ? optionProps[props.inputId]
                    : undefined;
            return (
                <Checkbox
                    key={String(value ?? index)}
                    {...checkboxProps}
                    {...optionProps}
                    value={value}
                    displayLabel={label}
                    name={
                        legacyName ??
                        optionProps.name ??
                        name ??
                        id
                    }
                    inputId={
                        legacyInputId ??
                        optionProps.inputId ??
                        `${id}-${String(value ?? index)}`
                    }
                    tabIndex={
                        optionProps.tabIndex ??
                        optionProps.tabindex ??
                        props.tabIndex ??
                        props.tabindex
                    }
                    ariaLabel={
                        optionProps.ariaLabel ??
                        props.ariaLabel
                    }
                    ariaLabelledBy={
                        optionProps.ariaLabelledBy ??
                        props.ariaLabelledBy
                    }
                    disabled={
                        optionProps.disabled ??
                        props.disabled
                    }
                    labelStyleClass={
                        optionProps.labelStyleClass ??
                        props.labelStyleClass
                    }
                />
            );
        })
        : children;

    const contextValue = useMemo(
        () => ({
            id,
            selected: selection,
            setCheckboxValue,
            registerCheckbox,
            provenance: strategy,
            hasProvenance,
            visualize,
            mode: provenanceMode,
            showTimeline,
            timeDomain,
            brushRange,
            tooltipLabel,
            restoreTemporalAtContext,
        }),
        [
            id,
            selection,
            setCheckboxValue,
            registerCheckbox,
            strategy,
            hasProvenance,
            visualize,
            provenanceMode,
            showTimeline,
            timeDomain,
            brushRange,
            tooltipLabel,
            restoreTemporalAtContext,
        ]
    );

    return (
        <CheckboxGroupContext.Provider value={contextValue}>
            <div
                ref={elementRef}
                id={id}
                role="group"
                aria-label={
                    groupProps["aria-label"] ?? tooltipLabel
                }
                data-widget-id={id}
                data-provenance-widget="checkbox-group"
                data-provenance-open={
                    showTimeline ? "true" : undefined
                }
                className={className ?? styleClass}
                style={style}
            >
                {visualize && hasProvenance && showTimeline && (
                    <div
                        data-timeline-axis={id}
                        data-provenance-chart-target={id}
                        style={{
                            marginLeft: "32px",
                            marginBottom: "12px",
                        }}
                    >
                        {temporalBrush && (
                            <TemporalRangeSlider
                                id={id}
                                label={tooltipLabel}
                                mode={provenanceMode}
                                value={brushDisplayRange}
                                onChange={handleBrushChange}
                                onSlideEnd={handleBrushEnd}
                            />
                        )}
                    </div>
                )}
                {renderedChildren}
            </div>
        </CheckboxGroupContext.Provider>
    );
};

export default CheckboxGroup;
