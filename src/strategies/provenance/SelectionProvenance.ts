import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";
import { Key } from "../../Guidance";
import Provenance, { TemporalRecord } from "./Provenance";

export interface AggregateSelectionRecord extends TemporalRecord {
  selections: number;
  interactions: number;
}

export interface TemporalSelectionRecord {
  select: TemporalRecord;
  unselect?: TemporalRecord;
}

export default class SelectionProvenance extends Provenance<
  AggregateSelectionRecord,
  TemporalSelectionRecord[]
> {
  temporalData: Array<{
    value: Iterable<string>;
    time: Date;
  }> = [];

  constructor(
    temporalData: Array<{
      value: Iterable<string>;
      time: Date;
    }> = []
  ) {
    super();
    this.domain.set("selections", [0, 0]);
    this.domain.set("interactions", [0, 0]);
    temporalData.forEach(({ value, time }) => this.insert(value, { time }));
  }

  insert(
    _value: Iterable<string>,
    options: { caller?: Key; time?: Date } = {}
  ) {
    const time = this.updateTime(options.time);
    const value = new Set(_value);
    let index = this.domain.get("index")![1];

    this.temporalData.push({ value, time });

    const oldValues = new Set(
      this.temporalData[this.temporalData.length - 2]?.value ?? []
    );
    const selected = value.difference(oldValues);
    const unselected = oldValues.difference(value);

    // Apply unselections first with an incremented index
    if (unselected.size > 0) {
      index += 1;
      unselected.forEach((s) => {
        const last = this.detailedData.get(s)?.at(-1);
        if (!last || last.unselect)
          throw new Error("Unselecting an unselected value");
        last.unselect = { time, index };

        let { selections, interactions } = this.aggregateData.get(s) ?? {
          selections: 0,
          interactions: 0,
        };
        if (!options.caller || options.caller === s) {
          interactions += 1;
        }

        this.aggregateData.set(s, {
          selections,
          interactions,
          index,
          time,
        });

        const maxInteractions = this.domain.get("interactions")![1];
        this.domain.set("interactions", [
          0,
          Math.max(maxInteractions, interactions),
        ]);
      });
    }

    // Apply selections second with another incremented index (if unselected happened) or first
    if (selected.size > 0) {
      index += 1;
      selected.forEach((s) => {
        this.detailedData.set(s, this.detailedData.get(s) ?? []);
        this.detailedData.get(s)!.push({ select: { time, index } });

        let { selections, interactions } = this.aggregateData.get(s) ?? {
          selections: 0,
          interactions: 0,
        };
        selections += 1;
        if (!options.caller || options.caller === s) {
          interactions += 1;
        }

        this.aggregateData.set(s, {
          selections,
          interactions,
          index,
          time,
        });

        const maxSelections = this.domain.get("selections")![1];
        const maxInteractions = this.domain.get("interactions")![1];

        this.domain.set("selections", [0, Math.max(maxSelections, selections)]);
        this.domain.set("interactions", [
          0,
          Math.max(maxInteractions, interactions),
        ]);
      });
    }

    this.domain.set("index", [0, index]);

    this.dispatchEvent(
      new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
        detail: { ...this, caller: options.caller },
      })
    );
    return this;
  }
}
