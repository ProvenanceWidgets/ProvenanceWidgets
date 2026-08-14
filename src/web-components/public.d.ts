import type {
  MultiSelectDropdownProps,
  ProvenanceMode,
  ProvenanceOption,
  RadioGroupProps,
  RangeSliderValue,
  SerializedProvenance,
  SingleSelectDropdownProps,
  SliderOptions,
} from "../index.js";

export type TypedEventTarget<TEvents extends object> = {
  addEventListener<K extends Extract<keyof TEvents, string>>(
    type: K,
    listener: (event: TEvents[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends Extract<keyof TEvents, string>>(
    type: K,
    listener: (event: TEvents[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
};

export type ProvenanceElement<
  TValue,
  TEvents extends object = object,
> = TypedEventTarget<
    TEvents & {
      provenanceChange: CustomEvent<SerializedProvenance<TValue>>;
    }
  > &
  HTMLElement & {
    provenance?: SerializedProvenance<TValue>;
    mode?: ProvenanceMode;
    sampleIntervalMs?: number;
    freeze?: boolean;
    visualize?: boolean;
    dataLabel?: string;
    temporalBrush?: boolean;
    widgetProps?: Record<string, unknown>;
  };

export type WebProvenanceSliderElement = ProvenanceElement<
  number | RangeSliderValue,
  {
    valueChange: CustomEvent<number>;
    highValueChange: CustomEvent<number>;
    selectedChange: CustomEvent<{ value: number; highValue?: number }>;
  }
> & {
  value?: number;
  highValue?: number;
  defaultValue?: number | RangeSliderValue;
  options?: SliderOptions;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

export type WebProvenanceInputTextElement = ProvenanceElement<
  string,
  { valueChange: CustomEvent<string> }
> & {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  inputProps?: Record<string, unknown>;
};

export type WebProvenanceDropdownElement = ProvenanceElement<
  unknown,
  { selectedChange: CustomEvent<unknown> }
> & {
  options?: SingleSelectDropdownProps["options"];
  selected?: unknown;
  defaultSelected?: unknown;
  optionLabel?: string;
  optionValue?: string;
  dataKey?: string;
  placeholder?: string;
  disabled?: boolean;
  dropdownProps?: Record<string, unknown>;
};

export type WebProvenanceMultiselectElement = ProvenanceElement<
  unknown[],
  { selectedChange: CustomEvent<unknown[]> }
> & {
  options?: MultiSelectDropdownProps["options"];
  selected?: unknown[];
  defaultSelected?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  dataKey?: string;
  placeholder?: string;
  disabled?: boolean;
  multiSelectProps?: Record<string, unknown>;
};

export type WebProvenanceRadiobuttonElement = ProvenanceElement<
  unknown,
  { selectedChange: CustomEvent<unknown> }
> & {
  data?: Array<ProvenanceOption | unknown>;
  selected?: unknown;
  defaultSelected?: unknown;
  optionLabel?: string;
  optionValue?: string;
  valueField?: string;
  dataKey?: string;
  name?: string;
  disabled?: boolean;
  radioButtonProps?: RadioGroupProps["radioButtonProps"];
};

export type WebProvenanceCheckboxElement = ProvenanceElement<
  unknown[],
  { selectedChange: CustomEvent<unknown[]> }
> & {
  data?: Array<ProvenanceOption | unknown>;
  selected?: unknown[];
  defaultSelected?: unknown[];
  optionLabel?: string;
  optionValue?: string;
  valueField?: string;
  dataKey?: string;
  name?: string;
  disabled?: boolean;
  checkboxProps?: Record<string, unknown>;
};

declare global {
  interface HTMLElementTagNameMap {
    "web-provenance-slider": WebProvenanceSliderElement;
    "web-provenance-multiselect": WebProvenanceMultiselectElement;
    "web-provenance-dropdown": WebProvenanceDropdownElement;
    "web-provenance-checkbox": WebProvenanceCheckboxElement;
    "web-provenance-radiobutton": WebProvenanceRadiobuttonElement;
    "web-provenance-inputtext": WebProvenanceInputTextElement;
  }
}

export {};
