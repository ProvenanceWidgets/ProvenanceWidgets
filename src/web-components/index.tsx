import React from "react";
import { createRoot, type Root } from "react-dom/client";
import CheckboxGroup from "../widgets/CheckboxGroup.js";
import InputText from "../widgets/InputText.js";
import MultiSelectDropdown from "../widgets/MultiSelectDropdown.js";
import ProvenanceButton from "../widgets/ProvenanceButton.js";
import RadioGroup from "../widgets/RadioGroup.js";
import Rangeslider from "../widgets/RangeSlider.js";
import SingleSelectDropdown from "../widgets/SingleSelectDropdown.js";
import Singleslider from "../widgets/SingleSlider.js";
import ProvenanceProvider from "../provenance/ProvenanceProvider.js";
import {
    COMMON_ATTRIBUTE_SCHEMA,
    COMMON_PROPERTIES,
    dispatchProvenanceElementEvent,
    getAttributeProperties,
    parseBooleanAttribute,
    parseNumberAttribute,
    parseStringAttribute,
} from "./elementContract.js";
import "./styles.css";

type AttributeConfig = {
    property: string;
    parse: (value: string | null) => unknown;
};

type ElementConfig = {
    kind: string;
    properties: string[];
    attributes?: Record<string, AttributeConfig>;
    renderWidget: (
        element: ProvenanceHTMLElement,
        props: Record<string, any>
    ) => React.ReactNode;
};

let generatedId = 0;

const HTMLElementBase: typeof HTMLElement =
    globalThis.HTMLElement ??
    (class {} as typeof HTMLElement);

const unique = <T,>(values: T[]) =>
    Array.from(new Set(values));

const hasOwn = (value: object, key: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(value, key);

const emit = (
    element: ProvenanceHTMLElement,
    eventName: string,
    detail: unknown
) => dispatchProvenanceElementEvent(
    element,
    eventName,
    detail
);

class ProvenanceHTMLElement extends HTMLElementBase {
    static elementConfig: ElementConfig;

    static get observedAttributes() {
        const config = this.elementConfig;
        return unique([
            "id",
            ...Object.keys(COMMON_ATTRIBUTE_SCHEMA),
            ...Object.keys(config?.attributes ?? {}),
        ]);
    }

    private reactRoot: Root | null = null;
    private connected = false;
    private renderQueued = false;
    private initialRenderTimer: ReturnType<
        typeof setTimeout
    > | null = null;
    private initialRenderListener:
        | (() => void)
        | null = null;
    private propertyValues = new Map<string, any>();
    private liveProvenance: unknown;

    connectedCallback() {
        this.connected = true;
        const config = (this.constructor as typeof ProvenanceHTMLElement)
            .elementConfig;
        unique([
            ...COMMON_PROPERTIES,
            "widgetProps",
            ...config.properties,
        ]).forEach(property => this.upgradeProperty(property));

        if (!this.id) {
            generatedId += 1;
            const id = `provenance-${config.kind}-${generatedId}`;
            this.id = id;
            console.warn(
                `${this.localName} requires an id; generated "${id}".`
            );
        }
        const queueInitialRender = () => {
            this.initialRenderListener = null;
            this.initialRenderTimer = setTimeout(() => {
                this.initialRenderTimer = null;
                if (this.connected) this.renderElement();
            }, 0);
        };

        // A parser-blocking external script may yield to timers before the
        // following inline configuration script runs. While the document is
        // loading, DOMContentLoaded is the reliable boundary after all those
        // initial property assignments.
        if (
            typeof document !== "undefined" &&
            document.readyState === "loading"
        ) {
            this.initialRenderListener = queueInitialRender;
            document.addEventListener(
                "DOMContentLoaded",
                queueInitialRender,
                { once: true }
            );
        } else {
            queueInitialRender();
        }
    }

    disconnectedCallback() {
        this.connected = false;
        this.renderQueued = false;
        if (this.initialRenderTimer !== null) {
            clearTimeout(this.initialRenderTimer);
            this.initialRenderTimer = null;
        }
        if (this.initialRenderListener !== null) {
            document.removeEventListener(
                "DOMContentLoaded",
                this.initialRenderListener
            );
            this.initialRenderListener = null;
        }
        this.reactRoot?.unmount();
        this.reactRoot = null;
    }

    attributeChangedCallback(
        _name: string,
        oldValue: string | null,
        newValue: string | null
    ) {
        if (oldValue === newValue) return;
        this.scheduleRender();
    }

    private upgradeProperty(property: string) {
        if (!hasOwn(this, property)) return;
        const value = (this as any)[property];
        delete (this as any)[property];
        (this as any)[property] = value;
    }

    getProperty(property: string) {
        if (property === "provenance") {
            return this.liveProvenance ??
                this.propertyValues.get(property);
        }
        return this.propertyValues.get(property);
    }

    setProperty(property: string, value: any) {
        if (property === "provenance") {
            this.liveProvenance = value;
        }
        if (value === undefined) {
            this.propertyValues.delete(property);
        } else {
            this.propertyValues.set(property, value);
        }
        this.scheduleRender();
    }

    updateProperty(property: string, value: any) {
        this.propertyValues.set(property, value);
        this.scheduleRender();
    }

    updateProvenance(value: unknown, _meta: unknown) {
        this.liveProvenance = value;
        emit(this, "provenanceChange", value);
    }

    private scheduleRender() {
        if (
            !this.connected ||
            this.renderQueued ||
            this.initialRenderTimer !== null ||
            this.initialRenderListener !== null
        ) {
            return;
        }
        this.renderQueued = true;
        queueMicrotask(() => {
            this.renderQueued = false;
            if (this.connected) this.renderElement();
        });
    }

    private getReactProps() {
        const config = (this.constructor as typeof ProvenanceHTMLElement)
            .elementConfig;
        const schema = {
            ...COMMON_ATTRIBUTE_SCHEMA,
            ...(config.attributes ?? {}),
        };
        const attributes = getAttributeProperties(this, schema);
        const explicit = Object.fromEntries(this.propertyValues);
        const inputProvenance =
            this.propertyValues.get("provenance");
        const widgetProps = explicit.widgetProps ?? {};
        delete explicit.widgetProps;

        return {
            ...widgetProps,
            ...attributes,
            ...explicit,
            ...(inputProvenance !== undefined
                ? { provenance: inputProvenance }
                : {}),
            id: this.id,
            dataLabel:
                explicit.dataLabel ??
                attributes.dataLabel ??
                this.id,
            onProvenanceChange: (
                provenance: unknown,
                meta: unknown
            ) => this.updateProvenance(provenance, meta),
        };
    }

    private renderElement() {
        const config = (this.constructor as typeof ProvenanceHTMLElement)
            .elementConfig;
        const props = this.getReactProps();
        this.reactRoot ??= createRoot(this);
        this.reactRoot.render(
            <ProvenanceProvider>
                <div
                    className="provenance-web-component"
                    data-provenance-web-component={config.kind}
                >
                    <div
                        className={
                            "provenance-web-component__footprint"
                        }
                    >
                        <ProvenanceButton target={this.id} />
                    </div>
                    <div
                        className="provenance-web-component__widget"
                    >
                        {config.renderWidget(this, props)}
                    </div>
                </div>
            </ProvenanceProvider>
        );
    }
}

const definePropertyAccessors = (
    ElementClass: typeof ProvenanceHTMLElement,
    properties: string[]
) => {
    unique([
        ...COMMON_PROPERTIES,
        "widgetProps",
        ...properties,
    ]).forEach(property => {
        Object.defineProperty(
            ElementClass.prototype,
            property,
            {
                configurable: true,
                enumerable: true,
                get(this: ProvenanceHTMLElement) {
                    return this.getProperty(property);
                },
                set(this: ProvenanceHTMLElement, value) {
                    this.setProperty(property, value);
                },
            }
        );
    });
};

const createElementClass = (config: ElementConfig) => {
    class WidgetElement extends ProvenanceHTMLElement {
        static elementConfig = config;
    }
    definePropertyAccessors(WidgetElement, config.properties);
    return WidgetElement;
};

const commonStringAttributes = {
    placeholder: {
        property: "placeholder",
        parse: parseStringAttribute,
    },
    disabled: {
        property: "disabled",
        parse: parseBooleanAttribute,
    },
};

const sliderAttributes = {
    value: {
        property: "value",
        parse: parseNumberAttribute,
    },
    "high-value": {
        property: "highValue",
        parse: parseNumberAttribute,
    },
    min: {
        property: "min",
        parse: parseNumberAttribute,
    },
    max: {
        property: "max",
        parse: parseNumberAttribute,
    },
    step: {
        property: "step",
        parse: parseNumberAttribute,
    },
    disabled: commonStringAttributes.disabled,
};

const WebProvenanceSlider = createElementClass({
    kind: "slider",
    properties: [
        "value",
        "highValue",
        "defaultValue",
        "options",
        "min",
        "max",
        "step",
        "disabled",
    ],
    attributes: sliderAttributes,
    renderWidget: (element, props) => {
        const arrayValue = Array.isArray(props.value)
            ? props.value
            : null;
        const lowValue = arrayValue?.[0] ?? props.value;
        const highValue =
            arrayValue?.[1] ?? props.highValue;
        const isRange =
            highValue !== undefined &&
            highValue !== null;

        if (isRange) {
            const updateRange = (
                nextValue: [number, number],
                emitSelection: boolean
            ) => {
                const [low, high] = nextValue;
                element.updateProperty("value", low);
                element.updateProperty("highValue", high);
                if (emitSelection) {
                    emit(element, "selectedChange", {
                        value: low,
                        highValue: high,
                    });
                } else {
                    emit(element, "valueChange", low);
                    emit(element, "highValueChange", high);
                }
            };
            return (
                <Rangeslider
                    {...props}
                    value={[lowValue, highValue]}
                    highValue={highValue}
                    onChange={(value: [number, number]) =>
                        updateRange(value, false)
                    }
                    onSelectedChange={(
                        value: [number, number]
                    ) => updateRange(value, true)}
                />
            );
        }

        return (
            <Singleslider
                {...props}
                value={lowValue}
                onChange={(value: number) => {
                    element.updateProperty("value", value);
                    emit(element, "valueChange", value);
                }}
                onSelectedChange={(value: number) => {
                    element.updateProperty("value", value);
                    // Preserve the public ChangeContext event shape.
                    emit(element, "selectedChange", { value });
                }}
            />
        );
    },
});

const WebProvenanceInputText = createElementClass({
    kind: "inputtext",
    properties: [
        "value",
        "defaultValue",
        "placeholder",
        "disabled",
        "inputProps",
    ],
    attributes: {
        value: {
            property: "value",
            parse: parseStringAttribute,
        },
        ...commonStringAttributes,
    },
    renderWidget: (element, props) => (
        <InputText
            {...props}
            onChange={(value: string) => {
                element.updateProperty("value", value);
            }}
            onValueChange={(value: string) => {
                element.updateProperty("value", value);
                emit(element, "valueChange", value);
            }}
        />
    ),
});

const selectionAttributes = {
    selected: {
        property: "selected",
        parse: parseStringAttribute,
    },
    ...commonStringAttributes,
};

const selectionProperties = [
    "options",
    "selected",
    "defaultSelected",
    "optionLabel",
    "optionValue",
    "dataKey",
    "placeholder",
    "disabled",
];

const WebProvenanceDropdown = createElementClass({
    kind: "dropdown",
    properties: [
        ...selectionProperties,
        "dropdownProps",
    ],
    attributes: selectionAttributes,
    renderWidget: (element, props) => (
        <SingleSelectDropdown
            {...props}
            options={props.options ?? []}
            onSelectedChange={(selected: unknown) => {
                element.updateProperty("selected", selected);
                emit(element, "selectedChange", selected);
            }}
        />
    ),
});

const WebProvenanceMultiselect = createElementClass({
    kind: "multiselect",
    properties: [
        ...selectionProperties,
        "multiSelectProps",
    ],
    attributes: commonStringAttributes,
    renderWidget: (element, props) => (
        <MultiSelectDropdown
            {...props}
            options={props.options ?? []}
            selected={props.selected ?? []}
            onSelectedChange={(selected: unknown[]) => {
                element.updateProperty("selected", selected);
                emit(element, "selectedChange", selected);
            }}
        />
    ),
});

const groupProperties = [
    "data",
    "selected",
    "defaultSelected",
    "optionLabel",
    "optionValue",
    "valueField",
    "dataKey",
    "name",
    "disabled",
];

const WebProvenanceRadiobutton = createElementClass({
    kind: "radiobutton",
    properties: [
        ...groupProperties,
        "radioButtonProps",
    ],
    attributes: {
        selected: selectionAttributes.selected,
        disabled: commonStringAttributes.disabled,
        name: {
            property: "name",
            parse: parseStringAttribute,
        },
    },
    renderWidget: (element, props) => (
        <RadioGroup
            {...props}
            data={props.data ?? []}
            onSelectedChange={(selected: unknown) => {
                element.updateProperty("selected", selected);
                emit(element, "selectedChange", selected);
            }}
        />
    ),
});

const WebProvenanceCheckbox = createElementClass({
    kind: "checkbox",
    properties: [
        ...groupProperties,
        "checkboxProps",
    ],
    attributes: {
        disabled: commonStringAttributes.disabled,
        name: {
            property: "name",
            parse: parseStringAttribute,
        },
    },
    renderWidget: (element, props) => (
        <CheckboxGroup
            {...props}
            data={props.data ?? []}
            selected={props.selected ?? []}
            onSelectedChange={(selected: unknown[]) => {
                element.updateProperty("selected", selected);
                emit(element, "selectedChange", selected);
            }}
        />
    ),
});

export const provenanceElementDefinitions = Object.freeze({
    "web-provenance-slider": WebProvenanceSlider,
    "web-provenance-multiselect": WebProvenanceMultiselect,
    "web-provenance-dropdown": WebProvenanceDropdown,
    "web-provenance-checkbox": WebProvenanceCheckbox,
    "web-provenance-radiobutton": WebProvenanceRadiobutton,
    "web-provenance-inputtext": WebProvenanceInputText,
});

export const defineProvenanceElements = (
    registry = globalThis.customElements
) => {
    if (!registry) return [];
    const defined: string[] = [];
    Object.entries(provenanceElementDefinitions)
        .forEach(([name, ElementClass]) => {
            if (registry.get(name)) return;
            registry.define(name, ElementClass);
            defined.push(name);
        });
    return defined;
};

defineProvenanceElements();
