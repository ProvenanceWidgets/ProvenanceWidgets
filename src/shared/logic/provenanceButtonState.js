const isInteractionRecord = record =>
    Boolean(record) && (
        record.kind === undefined || record.kind === "interaction"
    );

export const hasUserProvenance = provenance => {
    if (!provenance?.detailedData) return false;
    if (provenance.hasUserInteracted === true) return true;

    for (const value of provenance.detailedData.values()) {
        if (Array.isArray(value)) {
            if (value.some(record => (
                isInteractionRecord(record?.select) ||
                isInteractionRecord(record?.unselect)
            ))) {
                return true;
            }
            continue;
        }
        if (isInteractionRecord(value)) return true;
    }
    return false;
};

export const getProvenanceButtonState = ({
    provenance,
    visualize = true,
    open = false,
}) => {
    if (!visualize) return "hidden";
    if (!hasUserProvenance(provenance)) return "disabled";
    return open ? "temporal" : "aggregate";
};

const provenanceButtonTooltips = {
    disabled: {
        title: "No provenance yet.",
        description:
            "Interact with the widget to generate/see provenance.",
    },
    aggregate: {
        title: "Aggregate mode",
        description:
            "Showing overall frequency (larger size = more) and recency " +
            "(darker color = more) of past interactions.",
        action: "Click to toggle.",
    },
    temporal: {
        title: "Temporal mode",
        description:
            "Showing individual past interactions over the selected " +
            "time period.",
        action: "Click to toggle.",
    },
};

// Delay footprint help until the user has intentionally hovered.
export const PROVENANCE_BUTTON_TOOLTIP_DELAY_MS = 500;

export const getProvenanceButtonTooltip = state =>
    provenanceButtonTooltips[state] ?? null;

export const isInsideProvenanceInteraction = ({
    eventTarget,
    buttonElement,
    target,
}) => {
    if (buttonElement?.contains?.(eventTarget)) return true;
    const interaction = eventTarget?.closest?.(
        "[data-provenance-chart-target], " +
        "[data-widget-id], [data-provenance-widget]"
    );
    if (
        interaction?.getAttribute?.(
            "data-provenance-chart-target"
        ) === target ||
        interaction?.getAttribute?.("data-widget-id") === target ||
        interaction?.getAttribute?.("id") === target
    ) {
        return true;
    }

    const safeTarget = String(target ?? "")
        .replace(/[^a-zA-Z0-9_-]/g, "-");
    const dropdownPanel = eventTarget?.closest?.(
        `.provenance-dropdown-panel-${safeTarget}, ` +
        `.provenance-multiselect-panel-${safeTarget}`
    );
    return Boolean(dropdownPanel);
};
