import type {
  CSSProperties,
  Dispatch,
  FocusEventHandler,
  KeyboardEventHandler,
  ReactElement,
  ReactNode,
  SetStateAction,
} from "react";
import type { CheckboxProps as PrimeCheckboxProps } from "primereact/checkbox";
import type { DropdownProps as PrimeDropdownProps } from "primereact/dropdown";
import type { InputTextProps as PrimeInputTextProps } from "primereact/inputtext";
import type { MultiSelectProps as PrimeMultiSelectProps } from "primereact/multiselect";
import type { RadioButtonProps as PrimeRadioButtonProps } from "primereact/radiobutton";
import type { SliderProps as PrimeSliderProps } from "primereact/slider";
import type {
  LegacySerializedProvenance,
  ProvenanceChangeSource,
  ProvenanceController,
  ProvenanceMode,
  ProvenanceScheduler,
  ProvenanceStrategy,
  ProvenanceView,
  ProvenanceWidgetType,
  SerializedProvenance,
} from "@provenance-widgets/core";
import type {
  CommonProvenanceWidgetProps,
  WidgetRegistration,
} from "./provenance";

export type ProvenanceComponent<P> = (
  props: P
) => ReactElement | null;

export type WidgetChangeHandler<V> = (
  value: V,
  event?: unknown
) => void;

export type CheckboxChangeHandler<V> = (
  value: V,
  checked: boolean,
  event?: unknown
) => void;

export interface ProvenanceOption<TKey = unknown> {
  label?: ReactNode;
  value?: TKey;
  [field: string]: unknown;
}

export interface WidgetLayoutProps {
  className?: string;
  styleClass?: string;
  style?: CSSProperties;
  disabled?: boolean;
  "aria-label"?: string;
}

export interface CheckboxProps<TValue = unknown>
  extends Omit<
    PrimeCheckboxProps,
    | "id"
    | "value"
    | "checked"
    | "defaultChecked"
    | "onChange"
    | "name"
  > {
  id?: string;
  label?: ReactNode;
  displayLabel?: ReactNode;
  value?: TValue;
  checked?: boolean;
  defaultChecked?: boolean;
  name?: string;
  selectedChange?: CheckboxChangeHandler<TValue>;
  onChange?: PrimeCheckboxProps["onChange"];
  containerClassName?: string;
  containerStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  labelStyleClass?: string;
}

export interface CheckboxGroupProps<
  TValue = unknown,
  TOption extends ProvenanceOption<TValue> = ProvenanceOption<TValue>,
> extends CommonProvenanceWidgetProps<TValue[]>, WidgetLayoutProps {
  data?: Array<TOption | TValue>;
  options?: Array<TOption | TValue>;
  children?: ReactNode;
  label?: string;
  name?: string;
  selected?: TValue[];
  defaultSelected?: TValue[];
  value?: TValue[];
  defaultValue?: TValue[];
  onSelectedChange?: WidgetChangeHandler<TValue[]>;
  selectedChange?: WidgetChangeHandler<TValue[]>;
  onChange?: WidgetChangeHandler<TValue[]>;
  optionLabel?: string;
  optionValue?: string;
  valueField?: string;
  dataKey?: string;
  checkboxProps?: PrimeCheckboxProps;
  tabIndex?: number;
  tabindex?: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  labelStyleClass?: string;
}

export interface RadiobuttonProps<TValue = unknown>
  extends Omit<
    PrimeRadioButtonProps,
    | "id"
    | "value"
    | "checked"
    | "onChange"
    | "name"
  > {
  id?: string;
  label?: ReactNode;
  displayLabel?: ReactNode;
  value?: TValue;
  checked?: boolean;
  name?: string;
  stateItem?: TValue;
  setStateItem?: (value: TValue) => void;
  selectedChange?: WidgetChangeHandler<TValue>;
  onChange?: PrimeRadioButtonProps["onChange"];
  containerClassName?: string;
  containerStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  labelStyleClass?: string;
}

export interface RadioGroupProps<
  TValue = unknown,
  TOption extends ProvenanceOption<TValue> = ProvenanceOption<TValue>,
> extends CommonProvenanceWidgetProps<TValue | null>, WidgetLayoutProps {
  data?: Array<TOption | TValue>;
  options?: Array<TOption | TValue>;
  children?: ReactNode;
  label?: string;
  name?: string;
  selected?: TValue | null;
  defaultSelected?: TValue | null;
  value?: TValue | null;
  defaultValue?: TValue | null;
  onSelectedChange?: WidgetChangeHandler<TValue | null>;
  selectedChange?: WidgetChangeHandler<TValue | null>;
  onChange?: WidgetChangeHandler<TValue | null>;
  optionLabel?: string;
  optionValue?: string;
  valueField?: string;
  dataKey?: string;
  radioButtonProps?: PrimeRadioButtonProps;
  tabIndex?: number;
  tabindex?: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  labelStyleClass?: string;
}

export interface InputTextProps
  extends CommonProvenanceWidgetProps<string>,
    Omit<
      PrimeInputTextProps,
      "id" | "value" | "defaultValue" | "onChange" | "onKeyUp" | "onFocus"
    > {
  value?: string;
  defaultValue?: string;
  onChange?: WidgetChangeHandler<string>;
  onInputChange?: WidgetChangeHandler<string>;
  onValueChange?: WidgetChangeHandler<string>;
  valueChange?: WidgetChangeHandler<string>;
  onKeyUp?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  inputProps?: PrimeInputTextProps;
}

export interface SingleSelectDropdownProps<
  TOption = ProvenanceOption,
  TKey = unknown,
> extends CommonProvenanceWidgetProps<TKey | null>,
    Omit<
      PrimeDropdownProps,
      "id" | "options" | "value" | "defaultValue" | "onChange"
    > {
  options?: TOption[];
  selected?: TOption | TKey | null;
  defaultSelected?: TOption | TKey | null;
  value?: TOption | TKey | null;
  defaultValue?: TOption | TKey | null;
  onSelectedChange?: WidgetChangeHandler<TOption | null>;
  selectedChange?: WidgetChangeHandler<TOption | null>;
  onChange?: WidgetChangeHandler<TOption | null>;
  optionLabel?: string;
  optionValue?: string;
  dataKey?: string;
  dropdownProps?: PrimeDropdownProps;
}

export interface MultiSelectDropdownProps<
  TOption = ProvenanceOption,
  TKey = unknown,
> extends CommonProvenanceWidgetProps<TKey[]>,
    Omit<
      PrimeMultiSelectProps,
      "id" | "options" | "value" | "defaultValue" | "onChange"
    > {
  options?: TOption[];
  selected?: Array<TOption | TKey>;
  defaultSelected?: Array<TOption | TKey>;
  value?: Array<TOption | TKey>;
  defaultValue?: Array<TOption | TKey>;
  onSelectedChange?: WidgetChangeHandler<TOption[]>;
  selectedChange?: WidgetChangeHandler<TOption[]>;
  onChange?: WidgetChangeHandler<TOption[]>;
  optionLabel?: string;
  optionValue?: string;
  dataKey?: string;
  multiSelectProps?: PrimeMultiSelectProps;
}

export interface SliderOptions {
  floor?: number;
  ceil?: number;
  step?: number;
  showTicks?: boolean;
  tickStep?: number;
  ticksArray?: number[];
  translate?: (value: number) => ReactNode;
}

export interface CommonSliderProps<V>
  extends CommonProvenanceWidgetProps<V>,
    Omit<
      PrimeSliderProps,
      | "id"
      | "value"
      | "defaultValue"
      | "onChange"
      | "min"
      | "max"
      | "step"
    > {
  options?: SliderOptions;
  min?: number;
  max?: number;
  step?: number;
  showTicks?: boolean;
  tickStep?: number;
  ticksArray?: number[];
  sliderProps?: PrimeSliderProps;
  onChange?: WidgetChangeHandler<V>;
  onSelectedChange?: WidgetChangeHandler<V>;
  selectedChange?: WidgetChangeHandler<V>;
}

export interface SinglesliderProps extends CommonSliderProps<number> {
  value?: number;
  defaultValue?: number;
}

export type RangeSliderValue = [number, number];

export interface RangesliderProps
  extends CommonSliderProps<RangeSliderValue> {
  value?: RangeSliderValue | number;
  highValue?: number;
  defaultValue?: RangeSliderValue | number;
  recordExternalChanges?: boolean;
}

export interface ProvenanceButtonProps {
  target: string;
}

export interface ProvenanceProviderProps {
  children?: ReactNode;
}

export interface SuperProvenanceWidgetProps {
  id: string;
  components?: string[];
  default?: boolean;
  children?: ReactNode;
}

export interface AggregateViewProps {
  target: string;
}

export interface ChartProps {
  target: string;
  part?: "full" | "header" | "body";
  theme?: "dark" | "light";
  provenance?: unknown;
  provenanceStrategy?: unknown;
  mode?: ProvenanceMode;
  temporalBrush?: boolean;
}

export interface TimelineVisProps<TValue = unknown> {
  records?: unknown[];
  maxIndex?: number;
  mode?: ProvenanceMode;
  timeDomain?: unknown;
  brushRange?: [number, number];
  leftInsetPx?: number;
  tooltipId?: string;
  widgetId?: string;
  value?: TValue;
  kind?: string;
  onRestore?: (
    value: TValue,
    record: unknown,
    event: unknown,
    context: unknown
  ) => void;
}

export type RegisteredProvenanceMap = Map<string, unknown>;

export type UseProvenanceResult = [
  RegisteredProvenanceMap,
  Dispatch<SetStateAction<RegisteredProvenanceMap>>,
];

export interface UseProvenanceControllerOptions<V> {
  id: string;
  widgetType: ProvenanceWidgetType;
  value: V;
  provenance?: SerializedProvenance<V> | LegacySerializedProvenance<V>;
  mode?: ProvenanceMode;
  sampleIntervalMs?: number;
  freeze?: boolean;
  visualize?: boolean;
  onProvenanceChange?: CommonProvenanceWidgetProps<V>["onProvenanceChange"];
  strategy?: ProvenanceStrategy<unknown>;
  strategyFactory?: () => ProvenanceStrategy<unknown>;
  now?: () => Date;
  scheduler?: ProvenanceScheduler;
  valuesEqual?: (left: V, right: V) => boolean;
}

export interface UseProvenanceControllerResult<V> {
  id: string;
  widgetType: ProvenanceWidgetType;
  mode: ProvenanceMode;
  sampleIntervalMs: number;
  freeze: boolean;
  visualize: boolean;
  view: ProvenanceView;
  currentValue: V;
  hasProvenance: boolean;
  provenance: SerializedProvenance<V>;
  strategy: ProvenanceStrategy<unknown>;
  controller: ProvenanceController;
  recordInteraction(
    value: V,
    options?: { source?: ProvenanceChangeSource; caller?: string | number; time?: Date }
  ): boolean;
  recordExternalChange(value: V, options?: object): boolean;
  restoreValue(value: V, options?: object): boolean;
  replaceProvenance(
    provenance: SerializedProvenance<V> | LegacySerializedProvenance<V>,
    options?: { emit?: boolean }
  ): SerializedProvenance<V>;
  toggleView(): ProvenanceView;
}

export type UseProvenanceController = <V>(
  options: UseProvenanceControllerOptions<V>
) => UseProvenanceControllerResult<V>;

export interface WidgetRegistryApi {
  registrations: Map<string, WidgetRegistration<unknown>>;
  registerWidget<V>(registration: WidgetRegistration<V>): () => boolean | void;
  unregisterWidget(
    id: string,
    expectedRegistration?: WidgetRegistration<unknown>
  ): boolean;
  notifyWidget(id: string): boolean;
  getWidgetRegistration(id: string): WidgetRegistration<unknown> | undefined;
  restoreWidgetValue<V>(
    id: string,
    value: V,
    source?: ProvenanceChangeSource
  ): boolean;
  focusWidget(id: string): boolean;
}

export type UseWidgetRegistry = () => WidgetRegistryApi;

export type RevertedValueMap = Record<string, unknown>;

export type UseRevertedValue = <V = unknown>(id: string) => [
  V | undefined,
  Dispatch<SetStateAction<RevertedValueMap>>,
];

export type UseProvenance = () => UseProvenanceResult;
