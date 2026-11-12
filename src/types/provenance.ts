import type {
  LegacySerializedProvenance,
  ProvenanceChangeMeta,
  ProvenanceMode,
  SerializedProvenance,
  WidgetRegistration as CoreWidgetRegistration,
} from "@provenance-widgets/core";

import type { ScalabilityOptions } from "./scalability";

export type {
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
} from "@provenance-widgets/core";

export interface CommonProvenanceWidgetProps<V> {
  id: string;
  provenance?: SerializedProvenance<V> | LegacySerializedProvenance<V>;
  onProvenanceChange?: (
    provenance: SerializedProvenance<V>,
    meta: ProvenanceChangeMeta<V>
  ) => void;
  provenanceChange?: (
    provenance: SerializedProvenance<V>,
    meta: ProvenanceChangeMeta<V>
  ) => void;
  mode?: ProvenanceMode;
  sampleIntervalMs?: number;
  freeze?: boolean;
  visualize?: boolean;
  dataLabel?: string;
  "data-label"?: string;
  temporalBrush?: boolean;
  enableTemporalBrush?: boolean;
  scalability?: ScalabilityOptions;
}

export interface WidgetRegistration<V>
  extends CoreWidgetRegistration<V> {
  visualize?: boolean;
  mode?: ProvenanceMode;
  /** Active-view notice shown on the provenance footprint badge. */
  clippingMessage?: string | null;
  /** Changes whenever the active clipping window changes. */
  clippingRevision?: string;
}
