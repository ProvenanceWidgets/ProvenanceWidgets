import { RadioButton as RadioButton_ } from "primereact/radiobutton/radiobutton.esm.js";
import { useEffect, useMemo } from "react";
import { interpolateOranges } from "d3";
import Bars from "../shared/components/Bars.js";
import { useRadioGroup } from "../shared/contexts/RadioGroupContext.js";
import useElementSize from "../shared/hooks/useElementSize.js";
import useProvenanceTooltip from "../provenance/hooks/useProvenanceTooltip.js";
import TimelineVis from "./TimelineVis.js";
import DropdownBarLabel from "../shared/components/DropdownBarLabel.js";
import {
    formatAggregateTooltip,
    getAggregateTooltipRecord,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";

/**
 * One option in a RadioGroup.
 *
 * `label` remains the compatibility group/name prop; the visible data label
 * is supplied as `displayLabel`.
 */
const Radiobutton = ({
    label,
    displayLabel,
    value,
    stateItem,
    setStateItem,
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
    labelStyle,
    labelStyleClass,
    ...primeProps
}) => {
    const radioGroup = useRadioGroup();
    const [containerRef, { width: containerWidth }] =
        useElementSize();
    const tooltip = useProvenanceTooltip();
    const provenance = radioGroup?.provenance;
    const hasProvenance =
        radioGroup?.hasProvenance ?? false;
    const visualize = radioGroup?.visualize ?? true;
    const showTimeline =
        radioGroup?.showTimeline ?? false;
    const provenanceMode =
        radioGroup?.mode ?? "interaction";
    const timelineVersion =
        provenance?.domain?.get?.("index")?.[1] ?? 0;
    const timeVersion =
        provenance?.domain?.get?.("time")?.[2] ?? 0;
    const visibleLabel =
        displayLabel ?? value ?? label ?? "";
    const resolvedInputId =
        inputId ??
        `${radioGroup?.id ?? "radio"}-${String(value)}`;
    const checked = radioGroup
        ? Object.is(radioGroup.selected, value) ||
            (
                radioGroup.selected !== null &&
                value !== null &&
                String(radioGroup.selected) === String(value)
            )
        : stateItem === value;

    useEffect(() => {
        if (!radioGroup?.registerRadio) return undefined;
        return radioGroup.registerRadio({
            value,
            setStateItem,
        });
    }, [
        radioGroup?.registerRadio,
        value,
        setStateItem,
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
            // Reserve the final interval for the current state.
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
                        radioGroup?.tooltipLabel ??
                        radioGroup?.id,
                    value,
                    record: getAggregateTooltipRecord(
                        provenance,
                        value,
                        "single-selection"
                    ),
                    kind: "single-selection",
                }),
                { focusable: false }
            )
            : {};

    const handleChange = event => {
        if (disabled) return;
        const nextValue = event.value ?? value;
        onChange?.(event);
        selectedChange?.(nextValue, event);
        if (radioGroup?.selectValue) {
            radioGroup.selectValue(nextValue, event);
        } else {
            setStateItem?.(nextValue);
        }
    };

    return (
        <div
            {...aggregateTooltipProps}
            data-provenance-chart-target={radioGroup?.id}
            data-provenance-option={value}
            className={className ?? styleClass}
            style={{
                ...aggregateTooltipProps.style,
                ...style,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "1rem",
                width: "100%",
            }}
        >
            <RadioButton_
                {...primeProps}
                inputId={resolvedInputId}
                name={name ?? label ?? radioGroup?.id}
                value={value}
                disabled={disabled}
                tabIndex={tabIndex ?? tabindex}
                ariaLabel={ariaLabel}
                ariaLabelledBy={ariaLabelledBy}
                onChange={handleChange}
                checked={checked}
            />
            <div
                ref={containerRef}
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
                                    positionDomain: "selections",
                                    colorDomain:
                                        provenanceMode === "time"
                                            ? "selectionTime"
                                            : "selectionIndex",
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
                                timeDomain={radioGroup?.timeDomain}
                                brushRange={radioGroup?.brushRange}
                                tooltipId={tooltip}
                                widgetId={
                                    radioGroup?.tooltipLabel ??
                                    radioGroup?.id
                                }
                                value={value}
                                kind="single-selection"
                                onRestore={() =>
                                    radioGroup
                                        ?.restoreTemporalValue(value)
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
                        positionDomain="selections"
                        colorDomain={
                            provenanceMode === "time"
                                ? "selectionTime"
                                : "selectionIndex"
                        }
                    >
                        {visibleLabel}
                    </DropdownBarLabel>
                </label>
            </div>
        </div>
    );
};

export default Radiobutton;
