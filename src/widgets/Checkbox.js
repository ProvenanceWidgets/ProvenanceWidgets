import { Checkbox as Checkbox_ } from "primereact/checkbox/checkbox.esm.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolateOranges } from "d3";
import Bars from "../shared/components/Bars.js";
import { useCheckboxGroup } from "../shared/contexts/CheckboxGroupContext.js";
import useElementSize from "../shared/hooks/useElementSize.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import TimelineVis from "./TimelineVis.js";
import DropdownBarLabel from "../shared/components/DropdownBarLabel.js";
import {
    formatAggregateTooltip,
    getAggregateTooltipRecord,
    getTemporalRowTooltipProps,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";

const valuesEqual = (left, right) =>
    Object.is(left, right) ||
    (
        left !== null &&
        right !== null &&
        String(left) === String(right)
    );

/**
 * One option in a CheckboxGroup.
 *
 * The group owns the selected array and provenance. Standalone controlled
 * and uncontrolled behavior remains available for compatibility.
 */
const Checkbox = ({
    id: _id,
    label,
    displayLabel,
    value: valueProp,
    checked: checkedProp,
    defaultChecked = false,
    inputId,
    name,
    disabled,
    tabindex,
    tabIndex,
    ariaLabel,
    ariaLabelledBy,
    onChange,
    selectedChange,
    className,
    styleClass,
    style,
    containerClassName,
    containerStyle,
    labelStyle,
    labelStyleClass,
    ...primeProps
}) => {
    const checkboxGroup = useCheckboxGroup();
    const value = valueProp ?? label;
    const [standaloneChecked, setStandaloneChecked] =
        useState(checkedProp ?? defaultChecked);
    const [containerRef, { width: containerWidth }] =
        useElementSize();
    const containerElementRef = useRef(null);
    const setContainerElement = useCallback(element => {
        containerElementRef.current = element;
        containerRef(element);
    }, [containerRef]);
    const tooltip = useProvenanceTooltip();
    const provenance = checkboxGroup?.provenance;
    const hasProvenance =
        checkboxGroup?.hasProvenance ?? false;
    const visualize = checkboxGroup?.visualize ?? true;
    const showTimeline =
        checkboxGroup?.showTimeline ?? false;
    const provenanceMode =
        checkboxGroup?.mode ?? "interaction";
    const timelineVersion =
        provenance?.domain?.get?.("index")?.[1] ?? 0;
    const timeVersion =
        provenance?.domain?.get?.("time")?.[2] ?? 0;
    const visibleLabel =
        displayLabel ?? label ?? value ?? "";
    const resolvedInputId =
        inputId ??
        `${checkboxGroup?.id ?? "checkbox"}-${String(value)}`;
    const checked = checkboxGroup
        ? checkboxGroup.selected.some(selected =>
            valuesEqual(selected, value)
        )
        : checkedProp ?? standaloneChecked;

    useEffect(() => {
        if (checkedProp !== undefined) {
            setStandaloneChecked(Boolean(checkedProp));
        }
    }, [checkedProp]);

    useEffect(() => {
        if (!checkboxGroup?.registerCheckbox) return undefined;
        return checkboxGroup.registerCheckbox({ value });
    }, [
        checkboxGroup?.registerCheckbox,
        value,
    ]);

    const timelineData = useMemo(() => {
        if (
            !showTimeline ||
            !hasProvenance ||
            !provenance?.detailedData
        ) {
            return null;
        }
        const records = provenance.detailedData.get(value);
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
            maxIndex: Math.max(maxIndex, domainMax) + 1,
        };
    }, [
        showTimeline,
        hasProvenance,
        provenance,
        value,
        timelineVersion,
        timeVersion,
    ]);

    const aggregateTooltipProps =
        visualize && hasProvenance && !showTimeline
            ? getTooltipAnchorProps(
                tooltip,
                () => formatAggregateTooltip({
                    label:
                        checkboxGroup?.tooltipLabel ??
                        checkboxGroup?.id,
                    value,
                    record: getAggregateTooltipRecord(
                        provenance,
                        value,
                        "multi-selection"
                    ),
                    kind: "multi-selection",
                }),
                { focusable: false }
            )
            : {};
    const temporalTooltipProps =
        visualize && showTimeline && timelineData
            ? getTemporalRowTooltipProps(tooltip, {
                records: timelineData.records,
                maxIndex: timelineData.maxIndex,
                getBounds: () =>
                    containerElementRef.current
                        ?.getBoundingClientRect?.(),
                label:
                    checkboxGroup?.tooltipLabel ??
                    checkboxGroup?.id,
                value,
                kind: "multi-selection",
            })
            : {};
    const rowTooltipProps = showTimeline
        ? temporalTooltipProps
        : aggregateTooltipProps;

    const handleChange = event => {
        if (disabled || primeProps.readonly) return;
        const nextChecked = Boolean(event.checked);
        onChange?.(event);
        selectedChange?.(value, nextChecked, event);
        if (checkboxGroup?.setCheckboxValue) {
            checkboxGroup.setCheckboxValue(
                value,
                nextChecked,
                event
            );
        } else if (checkedProp === undefined) {
            setStandaloneChecked(nextChecked);
        }
    };

    return (
        <div
            {...rowTooltipProps}
            data-provenance-chart-target={checkboxGroup?.id}
            data-provenance-option={value}
            className={containerClassName}
            style={{
                ...rowTooltipProps.style,
                ...containerStyle,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "1rem",
                width: "100%",
            }}
        >
            <Checkbox_
                {...primeProps}
                inputId={resolvedInputId}
                name={name ?? checkboxGroup?.id ?? label}
                value={value}
                disabled={disabled}
                tabIndex={tabIndex ?? tabindex}
                ariaLabel={ariaLabel}
                ariaLabelledBy={ariaLabelledBy}
                className={className ?? styleClass}
                style={style}
                onChange={handleChange}
                checked={checked}
            />
            <div
                ref={setContainerElement}
                style={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
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
                                orientationScheme={
                                    interpolateOranges
                                }
                                barKeys={[value]}
                                encodings={{
                                    orientation: "horizontal",
                                    positionDomain: "interactions",
                                    colorDomain:
                                        provenanceMode === "time"
                                            ? "interactionTime"
                                            : "interactionIndex",
                                }}
                                width={containerWidth}
                                height={24}
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
                                mode={provenanceMode}
                                timeDomain={checkboxGroup?.timeDomain}
                                brushRange={checkboxGroup?.brushRange}
                                tooltipId={tooltip}
                                widgetId={
                                    checkboxGroup?.tooltipLabel ??
                                    checkboxGroup?.id
                                }
                                value={value}
                                kind="multi-selection"
                                onRestore={(
                                    _value,
                                    _record,
                                    _event,
                                    context
                                ) =>
                                    checkboxGroup
                                        ?.restoreTemporalAtContext(context)
                                }
                            />
                        </div>
                    )}

                <label
                    htmlFor={resolvedInputId}
                    className={labelStyleClass}
                    style={{
                        position: "relative",
                        zIndex: 1,
                        display: "block",
                        minWidth: "60px",
                        padding: "2px 8px",
                        cursor: disabled
                            ? "not-allowed"
                            : "pointer",
                        ...labelStyle,
                    }}
                >
                    <DropdownBarLabel
                        value={value}
                        provenance={provenance}
                        orientationScheme={interpolateOranges}
                        containerWidth={containerWidth}
                        showTimeline={showTimeline}
                        disableOverlay={!visualize || !hasProvenance}
                        positionDomain="interactions"
                        colorDomain={
                            provenanceMode === "time"
                                ? "interactionTime"
                                : "interactionIndex"
                        }
                    >
                        {visibleLabel}
                    </DropdownBarLabel>
                </label>
            </div>
        </div>
    );
};

export default Checkbox;
