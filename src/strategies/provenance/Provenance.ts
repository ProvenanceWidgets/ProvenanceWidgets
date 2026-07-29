import { epoch } from "../../constants";
import Guidance, { Key } from "../../Guidance";

export interface TemporalRecord {
  time: Date;
  index: number;
}

export interface TemporalValueRecord<V> extends TemporalRecord {
  value: V;
}

export default abstract class Provenance<
    AV extends TemporalRecord,
    TV,
    AK = Key,
    TK extends Key = Key
  >
  extends EventTarget
  implements Guidance<AV, TV, never, AK, TK>
{
  domain: Map<keyof AV | keyof TV, number[]>;
  aggregateData: Map<AK, AV>;
  detailedData: Map<TK, TV>;

  constructor() {
    super();
    this.domain = new Map();
    this.aggregateData = new Map();
    this.detailedData = new Map();
    this.domain.set("time", [
      epoch.getTime(),
      epoch.getTime(),
      epoch.getTime(),
    ]);
    this.domain.set("index", [0, 0]);
  }

  protected updateTime(time = new Date()) {
    let [minTime, _, newMaxTime] = this.domain.get("time")!;
    if (minTime === epoch.getTime()) minTime = time.getTime();
    if (newMaxTime === epoch.getTime()) newMaxTime = time.getTime();
    this.domain.set("time", [minTime, newMaxTime, time.getTime()]);
    return time;
  }

  abstract insert(
    value: AK | Iterable<AK>,
    options: { caller?: Key } & Partial<AV>
  ): this;
}
