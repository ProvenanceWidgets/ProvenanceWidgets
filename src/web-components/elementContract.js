export const WEB_COMPONENT_NAMES = Object.freeze([
    "web-provenance-slider",
    "web-provenance-multiselect",
    "web-provenance-dropdown",
    "web-provenance-checkbox",
    "web-provenance-radiobutton",
    "web-provenance-inputtext",
]);

export const WEB_COMPONENT_EVENTS = Object.freeze({
    slider: [
        "valueChange",
        "highValueChange",
        "selectedChange",
        "provenanceChange",
    ],
    inputtext: ["valueChange", "provenanceChange"],
    dropdown: ["selectedChange", "provenanceChange"],
    multiselect: ["selectedChange", "provenanceChange"],
    radiobutton: ["selectedChange", "provenanceChange"],
    checkbox: ["selectedChange", "provenanceChange"],
});

export const parseBooleanAttribute = value => {
    if (value === null || value === undefined) return undefined;
    if (
        value === false ||
        value === "false" ||
        value === "0" ||
        value === "off"
    ) {
        return false;
    }
    return true;
};

export const parseNumberAttribute = value => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

export const parseStringAttribute = value =>
    value === null || value === undefined
        ? undefined
        : String(value);

export const dispatchProvenanceElementEvent = (
    element,
    name,
    detail
) => element.dispatchEvent(new CustomEvent(name, {
    detail,
    bubbles: true,
    composed: true,
}));

export const COMMON_ATTRIBUTE_SCHEMA = Object.freeze({
    mode: {
        property: "mode",
        parse: parseStringAttribute,
    },
    "sample-interval-ms": {
        property: "sampleIntervalMs",
        parse: parseNumberAttribute,
    },
    freeze: {
        property: "freeze",
        parse: parseBooleanAttribute,
    },
    visualize: {
        property: "visualize",
        parse: parseBooleanAttribute,
    },
    "data-label": {
        property: "dataLabel",
        parse: parseStringAttribute,
    },
    "temporal-brush": {
        property: "temporalBrush",
        parse: parseBooleanAttribute,
    },
});

export const COMMON_PROPERTIES = Object.freeze([
    "provenance",
    "mode",
    "sampleIntervalMs",
    "freeze",
    "visualize",
    "dataLabel",
    "temporalBrush",
]);

export const getAttributeProperties = (
    element,
    schema
) => Object.fromEntries(
    Object.entries(schema)
        .map(([attribute, config]) => [
            config.property,
            config.parse(element.getAttribute(attribute)),
        ])
        .filter(([, value]) => value !== undefined)
);
