import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";
import { Key } from "../../Guidance";
import { Optional } from "../../utils";
import Provenance, { TemporalRecord, TemporalValueRecord } from "./Provenance";

export interface AggregateGenericRecord extends TemporalRecord {
  count: number;
}

export default class GenericProvenance<T extends Key> extends Provenance<
  AggregateGenericRecord,
  TemporalValueRecord<T>,
  T,
  number
> {
  constructor(temporalData: Optional<TemporalValueRecord<T>, "index">[] = []) {
    super();
    this.domain.set("count", [0, 0]);
    temporalData.forEach(({ value, time }) => this.insert(value, { time }));
  }

  insert(value: T, options: { caller?: Key; time?: Date } = {}) {
    const time = this.updateTime(options.time);
    const index = this.domain.get("index")![1] + 1;

    this.detailedData.set(index, { value, time, index });

    const count = (this.aggregateData.get(value)?.count ?? 0) + 1;
    this.aggregateData.set(value, { time, count, index });

    const maxCount = this.domain.get("count")![1];
    this.domain.set("count", [0, Math.max(maxCount, count)]);
    this.domain.set("index", [0, index]);

    const { caller } = options;
    this.dispatchEvent(
      new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
        detail: { ...this, caller },
      })
    );
    return this;
  }
}
