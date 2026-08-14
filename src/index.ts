import type { ReactElement } from "react";

import AggregateViewImplementation from "./widgets/AggregateView.js";
import ChartImplementation from "./widgets/Chart.js";
import CheckboxImplementation from "./widgets/Checkbox.js";
import CheckboxGroupImplementation from "./widgets/CheckboxGroup.js";
import InputTextImplementation from "./widgets/InputText.js";
import MultiSelectDropdownImplementation from "./widgets/MultiSelectDropdown.js";
import ProvenanceButtonImplementation from "./widgets/ProvenanceButton.js";
import RadiobuttonImplementation from "./widgets/RadioButton.js";
import RadioGroupImplementation from "./widgets/RadioGroup.js";
import RangesliderImplementation from "./widgets/RangeSlider.js";
import SingleSelectDropdownImplementation from "./widgets/SingleSelectDropdown.js";
import SinglesliderImplementation from "./widgets/SingleSlider.js";
import TimelineVisImplementation from "./widgets/TimelineVis.js";
import SuperProvenanceWidgetImplementation from "./widgets/SuperProvenanceWidget.js";
import ProvenanceProviderImplementation from "./provenance/ProvenanceProvider.js";
import useProvenanceImplementation from "./provenance/hooks/useProvenance.js";
import useRevertedValueImplementation from "./provenance/hooks/useRevertedValue.js";
import useProvenanceControllerImplementation from "./provenance/hooks/useProvenanceController.js";
import useWidgetRegistryImplementation from "./provenance/hooks/useWidgetRegistry.js";
import type {
  AggregateViewProps,
  ChartProps,
  CheckboxGroupProps,
  CheckboxProps,
  InputTextProps,
  MultiSelectDropdownProps,
  ProvenanceButtonProps,
  ProvenanceComponent,
  ProvenanceProviderProps,
  RadiobuttonProps,
  RadioGroupProps,
  RangesliderProps,
  SingleSelectDropdownProps,
  SinglesliderProps,
  SuperProvenanceWidgetProps,
  TimelineVisProps,
  UseProvenance,
  UseProvenanceController,
  UseRevertedValue,
  UseWidgetRegistry,
} from "./types/components";

export * from "@provenance-widgets/core";

export type {
  CommonProvenanceWidgetProps,
  LegacyProvenanceRecord,
  LegacySerializedProvenance,
  ProvenanceChangeMeta,
  ProvenanceChangeSource,
  ProvenanceMode,
  ProvenanceRecordKind,
  ProvenanceView,
  ProvenanceWidgetType,
  SerializedProvenance,
  SerializedProvenanceRecord,
  WidgetRegistration,
} from "./types/provenance";

export type * from "./types/components";

export const AggregateView =
  AggregateViewImplementation as ProvenanceComponent<AggregateViewProps>;

export const Chart = ChartImplementation as ProvenanceComponent<ChartProps>;

export const Checkbox = CheckboxImplementation as <TValue = unknown>(
  props: CheckboxProps<TValue>
) => ReactElement | null;

export const CheckboxGroup = CheckboxGroupImplementation as <
  TValue = unknown,
>(props: CheckboxGroupProps<TValue>) => ReactElement | null;

export const InputText =
  InputTextImplementation as ProvenanceComponent<InputTextProps>;

export const MultiSelectDropdown = MultiSelectDropdownImplementation as <
  TOption = unknown,
  TKey = unknown,
>(props: MultiSelectDropdownProps<TOption, TKey>) => ReactElement | null;

export const ProvenanceButton =
  ProvenanceButtonImplementation as ProvenanceComponent<ProvenanceButtonProps>;

export const Radiobutton = RadiobuttonImplementation as <TValue = unknown>(
  props: RadiobuttonProps<TValue>
) => ReactElement | null;

export const RadioGroup = RadioGroupImplementation as <TValue = unknown>(
  props: RadioGroupProps<TValue>
) => ReactElement | null;

export const Rangeslider =
  RangesliderImplementation as ProvenanceComponent<RangesliderProps>;

export const SingleSelectDropdown = SingleSelectDropdownImplementation as <
  TOption = unknown,
  TKey = unknown,
>(props: SingleSelectDropdownProps<TOption, TKey>) => ReactElement | null;

export const Singleslider =
  SinglesliderImplementation as ProvenanceComponent<SinglesliderProps>;

export const TimelineVis = TimelineVisImplementation as <TValue = unknown>(
  props: TimelineVisProps<TValue>
) => ReactElement | null;

export const SuperProvenanceWidget =
  SuperProvenanceWidgetImplementation as ProvenanceComponent<
    SuperProvenanceWidgetProps
  >;

export const ProvenanceProvider =
  ProvenanceProviderImplementation as ProvenanceComponent<
    ProvenanceProviderProps
  >;

export const useProvenance = useProvenanceImplementation as UseProvenance;
export const useRevertedValue =
  useRevertedValueImplementation as UseRevertedValue;
export const useProvenanceController =
  useProvenanceControllerImplementation as UseProvenanceController;
export const useWidgetRegistry =
  useWidgetRegistryImplementation as unknown as UseWidgetRegistry;
