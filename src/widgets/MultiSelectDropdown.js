import { MultiSelect as MultiSelect_ } from "primereact/multiselect/multiselect.esm.js";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { interpolateOranges } from "d3";
import Bars from "../shared/components/Bars.js";
import {
    SelectionProvenance,
    PROVENANCE_INSERT_EVENT,
} from "@provenance-widgets/core";
import useProvenanceController from "../provenance/hooks/useProvenanceController.js";
import useRevertedValue from "../provenance/hooks/useRevertedValue.js";
import useWidgetRegistry from "../provenance/hooks/useWidgetRegistry.js";
import useElementSize from "../shared/hooks/useElementSize.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import TimelineVis from "./TimelineVis.js";
import DropdownBarLabel from "../shared/components/DropdownBarLabel.js";
import {
    formatAggregateTooltip,
    getAggregateTooltipRecord,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import {
    getSingleSelectOptionKey,
    getSingleSelectOptionLabel,
} from "../shared/logic/singleSelectDropdownValue.js";
import {
    callMultiSelectCallbacks,
    getControlledMultiSelectValue,
    getInitialMultiSelectValue,
    getMultiSelectCaller,
    getMultiSelectKeysAtTimelinePoint,
    getPrimeMultiSelectValue,
    isResolvableMultiSelectValue,
    multiSelectToProvenanceValue,
    multiSelectValueKey,
    provenanceValueToMultiSelect,
    resolveMultiSelectOptions,
    restoreMultiSelectTemporalValue,
} from "../shared/logic/multiSelectDropdownValue.js";
import {
    getSelectionTimeDomain,
    normalizeSelectionBrushRange,
} from "../shared/logic/selectionTimeline.js";
import { shouldCommitSliderChange } from "../shared/logic/sliderInteraction.js";
import { resolveTemporalBrushEnabled } from "../shared/logic/sliderTemporal.js";
import TemporalRangeSlider from "../shared/components/TemporalRangeSlider.js";

const MultiSelectItem = ({
    children,
    optionKey,
    provenance,
    hasProvenance,
    mode,
    showTimeline,
    timeDomain,
    brushRange,
    target,
    tooltipLabel,
    visualize,
    onTemporalRestore,
}) => {
    const [containerRef, { width: containerWidth }] =
        useElementSize();
    const tooltip = useProvenanceTooltip();
    const timelineVersion =
        provenance?.domain?.get?.("index")?.[1] ?? 0;
    const timeVersion =
        provenance?.domain?.get?.("time")?.[2] ?? 0;

    const timelineData = useMemo(() => {
        if (
            !showTimeline ||
            !hasProvenance ||
            !provenance?.detailedData
        ) {
            return null;
        }
        const records = provenance.detailedData.get(optionKey);
        if (!records) return null;

        let maxIndex = 0;
        for (const optionRecords of provenance.detailedData.values()) {
            for (const record of optionRecords) {
                maxIndex = Math.max(
                    maxIndex,
                    record.select?.index ?? 0,
                    record.unselect?.index ?? 0
                );
            }
        }
        const domainMax =
            provenance.domain?.get?.("index")?.[1] ?? 0;
        return {
            records,
            // Extend the final interval from the last event to "now".
            maxIndex: Math.max(maxIndex, domainMax) + 1,
        };
    }, [
        showTimeline,
        hasProvenance,
        provenance,
        optionKey,
        timelineVersion,
        timeVersion,
    ]);

    const aggregateTooltipProps =
        visualize && hasProvenance && !showTimeline
            ? getTooltipAnchorProps(
                tooltip,
                () => formatAggregateTooltip({
                    label: tooltipLabel,
                    value: optionKey,
                    record: getAggregateTooltipRecord(
                        provenance,
                        optionKey,
                        "multi-selection"
                    ),
                    kind: "multi-selection",
                }),
                { focusable: false }
            )
            : {};

    return (
        <div
            ref={containerRef}
            {...aggregateTooltipProps}
            data-provenance-chart-target={target}
            data-provenance-option={optionKey}
            style={{
                ...aggregateTooltipProps.style,
                position: "relative",
                height: "32px",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                width: "100%",
                flex: 1,
            }}
        >
            {visualize &&
                hasProvenance &&
                !showTimeline &&
                containerWidth > 0 && (
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 0,
                        }}
                    >
                        <Bars
                            provenance={provenance}
                            orientationScheme={interpolateOranges}
                            barKeys={[optionKey]}
                            encodings={{
                                orientation: "horizontal",
                                positionDomain: "interactions",
                                colorDomain:
                                    mode === "time"
                                        ? "interactionTime"
                                        : "interactionIndex",
                            }}
                            width={containerWidth}
                            height={32}
                            layout="checkbox"
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </div>
                )}

            {visualize &&
                showTimeline &&
                timelineData && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 0,
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <TimelineVis
                            records={timelineData.records}
                            maxIndex={timelineData.maxIndex}
                            mode={mode}
                            timeDomain={timeDomain}
                            brushRange={brushRange}
                            tooltipId={tooltip}
                            widgetId={tooltipLabel}
                            value={optionKey}
                            kind="multi-selection"
                            onRestore={(
                                _value,
                                _record,
                                _event,
                                context
                            ) => onTemporalRestore(context)}
                        />
                    </div>
                )}

            <DropdownBarLabel
                value={optionKey}
                provenance={provenance}
                orientationScheme={interpolateOranges}
                containerWidth={containerWidth}
                showTimeline={showTimeline}
                disableOverlay={!visualize || !hasProvenance}
                positionDomain="interactions"
                colorDomain={
                    mode === "time"
                        ? "interactionTime"
                        : "interactionIndex"
                }
            >
                {children}
            </DropdownBarLabel>
        </div>
    );
};

/**
 * Public selected values remain complete option objects. Provenance stores
 * stable option keys so imported selections and SuperProvenance replay do
 * not depend on object identity.
 */
const MultiSelectDropdown = (props) => {
    const {
        id,
        options = [],
        selected: _selected,
        defaultSelected: _defaultSelected,
        value: _value,
        defaultValue: _defaultValue,
        onSelectedChange: _onSelectedChange,
        selectedChange: _selectedChange,
        onChange: _onChange,
        provenance: _provenance,
        onProvenanceChange: _onProvenanceChange,
        provenanceChange: _provenanceChange,
        mode: _mode,
        sampleIntervalMs: _sampleIntervalMs,
        freeze: _freeze,
        visualize: _visualize,
        dataLabel,
        "data-label": legacyDataLabel,
        multiSelectProps = {},
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
        ...primeProps
    } = props;
    const tooltipLabel = dataLabel ?? legacyDataLabel ?? id;
    const visualize = props.visualize ?? true;
    const temporalBrush = resolveTemporalBrushEnabled({
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
    });
    const config = useMemo(
        () => ({
            dataKey: props.dataKey,
            optionLabel: props.optionLabel,
            optionValue: props.optionValue,
        }),
        [
            props.dataKey,
            props.optionLabel,
            props.optionValue,
        ]
    );
    const initialSelectionRef = useRef(
        getInitialMultiSelectValue(props, options, config)
    );
    const initialProvenanceValueRef = useRef(
        multiSelectToProvenanceValue(
            initialSelectionRef.current,
            config
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
    const dropdownRef = useRef(null);
    const propsRef = useRef(props);
    const optionsRef = useRef(options);
    const configRef = useRef(config);
    propsRef.current = props;
    optionsRef.current = options;
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
        widgetType: "multiselect",
        value: initialProvenanceValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
    });
    const [selection, setSelection] = useState(() =>
        provenanceValueToMultiSelect(
            currentValue,
            options,
            config
        )
    );
    const currentValueRef = useRef(currentValue);
    const selectionRef = useRef(selection);
    const serializedProvenanceRef = useRef(serializedProvenance);
    currentValueRef.current = currentValue;
    selectionRef.current = selection;
    serializedProvenanceRef.current = serializedProvenance;
    const currentValueKey = multiSelectValueKey(currentValue);
    const historyVersion = serializedProvenance.data
        .map(record => record.timestamp)
        .join("|");
    const timeDomain = useMemo(
        () => getSelectionTimeDomain(serializedProvenance.data),
        [historyVersion]
    );

    useEffect(() => {
        const restored = provenanceValueToMultiSelect(
            currentValue,
            options,
            config
        );
        setSelection(restored);
    }, [currentValueKey, options, config]);

    const controlledSelection = getControlledMultiSelectValue(
        props,
        options,
        config
    );
    const controlledPresent = controlledSelection !== undefined;
    const controlledValue = controlledPresent
        ? multiSelectToProvenanceValue(
            controlledSelection,
            config
        )
        : undefined;
    const controlledValueKey = controlledPresent
        ? multiSelectValueKey(controlledValue)
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
            setSelection(controlledSelection);
            if (
                emittedValueKeyRef.current === controlledValueKey ||
                provenanceChanged
            ) {
                emittedValueKeyRef.current = null;
            } else {
                recordExternalChange(controlledValue, {
                    caller: getMultiSelectCaller(
                        currentValueRef.current,
                        controlledValue
                    ),
                });
            }
        }
        previousControlledKeyRef.current = controlledValueKey;
        previousProvenanceRef.current = props.provenance;
    }, [
        controlledPresent,
        controlledSelection,
        controlledValue,
        controlledValueKey,
        props.provenance,
        recordExternalChange,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            if (
                !isResolvableMultiSelectValue(
                    nextValue,
                    optionsRef.current,
                    configRef.current
                )
            ) {
                return false;
            }
            const restored = provenanceValueToMultiSelect(
                nextValue,
                optionsRef.current,
                configRef.current
            );
            const provenanceValue =
                multiSelectToProvenanceValue(
                    restored,
                    configRef.current
                );
            const changed = restoreValue(provenanceValue, {
                caller: getMultiSelectCaller(
                    currentValueRef.current,
                    provenanceValue
                ),
            });
            emittedValueKeyRef.current =
                multiSelectValueKey(provenanceValue);
            setSelection(restored);
            callMultiSelectCallbacks(
                propsRef.current,
                restored,
                { source }
            );
            return changed;
        },
        [restoreValue]
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
            type: "multiselect",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => selectionRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            focus: () => {
                elementRef.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                (
                    elementRef.current?.querySelector?.(
                        '[role="combobox"]'
                    ) ??
                    elementRef.current
                )?.focus?.();
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
            const open = Boolean(event.detail.open);
            setShowTimeline(open);
            if (open) {
                dropdownRef.current?.show?.();
            } else {
                dropdownRef.current?.hide?.();
            }
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

    const handleChange = event => {
        const nextSelection = resolveMultiSelectOptions(
            options,
            event.value,
            config
        );
        const nextValue = multiSelectToProvenanceValue(
            nextSelection,
            config
        );
        emittedValueKeyRef.current =
            multiSelectValueKey(nextValue);
        recordInteraction(nextValue, {
            caller: getMultiSelectCaller(
                currentValueRef.current,
                nextValue
            ),
        });
        setSelection(nextSelection);
        callMultiSelectCallbacks(
            props,
            nextSelection,
            event
        );
        multiSelectProps.onChange?.(event);
    };

    const handleTemporalRestore = context => {
        const keys = getMultiSelectKeysAtTimelinePoint({
            provenance: strategy,
            // TimelineVis removes the baseline index for plotting. Strategy
            // intervals retain it, so add it back before
            // resolving the simultaneously selected set.
            point:
                provenanceMode === "interaction" &&
                context?.point !== undefined
                ? Number(context?.point) + 1
                : context?.point,
            mode: provenanceMode,
        });
        restoreMultiSelectTemporalValue({
            restoreWidgetValue,
            target: id,
            value: keys,
        });
    };

    const commitBrushRange = range => {
        setBrushRange(range);
        setBrushDisplayRange(range);
        window.dispatchEvent(new CustomEvent(
            "provenance-widgets",
            {
                detail: {
                    id,
                    widget: "multiselect",
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

    const originalItemTemplate =
        multiSelectProps.itemTemplate ??
        primeProps.itemTemplate;
    const originalFooterTemplate =
        multiSelectProps.panelFooterTemplate ??
        primeProps.panelFooterTemplate;
    const safePanelClass =
        `provenance-multiselect-panel-${String(id)
            .replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const panelClassName = [
        primeProps.panelClassName,
        multiSelectProps.panelClassName,
        safePanelClass,
    ].filter(Boolean).join(" ");
    const primeValue = getPrimeMultiSelectValue(
        selection,
        config
    );

    return (
        <div
            ref={elementRef}
            data-label={tooltipLabel}
            data-widget-id={id}
            data-provenance-open={
                showTimeline ? "true" : "false"
            }
            style={{
                marginTop: "1rem",
                position: "relative",
            }}
        >
            <style>{`
                .${safePanelClass} .p-multiselect-item {
                    padding: 0 !important;
                }
                .${safePanelClass} .p-multiselect-item-content {
                    width: 100%;
                    min-width: 0;
                }
                .${safePanelClass} .p-multiselect-item > span {
                    flex-grow: 1;
                    min-width: 0;
                }
                .${safePanelClass} .p-multiselect-item.p-highlight,
                .${safePanelClass} .p-multiselect-item.p-focus {
                    background: transparent !important;
                }
            `}</style>
            <MultiSelect_
                {...primeProps}
                {...multiSelectProps}
                ref={dropdownRef}
                id={id}
                data-widget-id={id}
                options={options}
                value={primeValue}
                onChange={handleChange}
                placeholder={props.placeholder ?? "Select"}
                display={props.display ?? "chip"}
                style={{
                    width: "100%",
                    ...primeProps.style,
                    ...multiSelectProps.style,
                }}
                panelClassName={panelClassName}
                onShow={event => {
                    primeProps.onShow?.(event);
                    primeProps.onPanelShow?.(event);
                    multiSelectProps.onShow?.(event);
                    multiSelectProps.onPanelShow?.(event);
                }}
                onHide={event => {
                    primeProps.onHide?.(event);
                    primeProps.onPanelHide?.(event);
                    multiSelectProps.onHide?.(event);
                    multiSelectProps.onPanelHide?.(event);
                    if (showTimeline) {
                        window.dispatchEvent(new CustomEvent(
                            "provenance-dropdown-visibility",
                            {
                                detail: {
                                    target: id,
                                    open: false,
                                },
                            }
                        ));
                    }
                }}
                onFilter={event => {
                    primeProps.onFilter?.(event);
                    multiSelectProps.onFilter?.(event);
                }}
                itemTemplate={(option, templateOptions) => {
                    const optionKey =
                        getSingleSelectOptionKey(option, config);
                    const content = originalItemTemplate
                        ? originalItemTemplate(
                            option,
                            templateOptions
                        )
                        : getSingleSelectOptionLabel(
                            option,
                            config
                        );
                    return (
                        <MultiSelectItem
                            optionKey={optionKey}
                            provenance={strategy}
                            hasProvenance={hasProvenance}
                            mode={provenanceMode}
                            showTimeline={showTimeline}
                            timeDomain={timeDomain}
                            brushRange={brushRange}
                            target={id}
                            tooltipLabel={tooltipLabel}
                            visualize={visualize}
                            onTemporalRestore={
                                handleTemporalRestore
                            }
                        >
                            {content}
                        </MultiSelectItem>
                    );
                }}
                panelFooterTemplate={templateOptions => (
                    <>
                        {originalFooterTemplate?.(templateOptions)}
                        {showTimeline && (
                            <div
                                data-provenance-temporal-footer={id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                    padding: "8px 20px 12px",
                                    gap: "6px",
                                    borderTop: "1px solid #ced4da",
                                    backgroundColor: "#fff",
                                }}
                            >
                                {temporalBrush && (
                                    <TemporalRangeSlider
                                        id={id}
                                        label={tooltipLabel}
                                        mode={provenanceMode}
                                        placement="footer"
                                        value={brushDisplayRange}
                                        onChange={handleBrushChange}
                                        onSlideEnd={handleBrushEnd}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            />
        </div>
    );
};

export default MultiSelectDropdown;
