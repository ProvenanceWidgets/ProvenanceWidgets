import { TreeSet } from "tstl";
import { Key } from "../../Guidance";
import { EntryType, Optional } from "../../utils";
import Provenance, { TemporalRecord, TemporalValueRecord } from "./Provenance";
import { epoch, UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";

export interface AggregateRangeSliderRecord extends TemporalRecord {
  count: number;
  highValue: number;
}

export type SliderValue = [number, number];

export type TemporalRangeSliderRecord = TemporalValueRecord<SliderValue>;

export default class RangedProvenance extends Provenance<
  AggregateRangeSliderRecord,
  TemporalRangeSliderRecord,
  any,
  number
> {
  minValue: number;
  maxValue: number;
  aggregateData: Map<number, AggregateRangeSliderRecord>;

  constructor(
    minValue: number,
    maxValue: number,
    temporalData?: Optional<TemporalRangeSliderRecord, "index">[]
  ) {
    super();
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.domain.set("count", [0, 0]);
    this.aggregateData = new Map();
    if (!temporalData || temporalData.length === 0) return;
    this.reconstruct(temporalData);
  }

  private boundEdges(entries: Array<EntryType<typeof this.aggregateData>>) {
    const lowValue = entries[0][0];
    const highValue = entries.at(-1)![1].highValue;

    const first: typeof entries = [];
    const last: typeof entries = [];

    if (this.minValue < lowValue) {
      first.push([
        this.minValue,
        {
          count: 0,
          time: epoch,
          index: -1,
          highValue: lowValue,
        },
      ]);
    }

    if (this.maxValue > highValue) {
      last.push([
        highValue,
        {
          count: 0,
          time: epoch,
          index: -1,
          highValue: this.maxValue,
        },
      ]);
    }

    this.aggregateData = new Map([...first, ...entries, ...last]);
  }

  reconstruct(temporalData: Optional<TemporalRangeSliderRecord, "index">[]) {
    this.domain.set("index", [0, temporalData.length]);
    temporalData.forEach(({ value, time }, index) => {
      this.updateTime(time);
      this.detailedData.set(index + 1, { value, time, index: index + 1 });
    });

    enum EdgeType {
      START,
      END,
    }

    const sortedData = [...this.detailedData.values()]
      .flatMap(({ value: [lowValue, highValue], time, index }) => [
        {
          value: lowValue,
          edge: EdgeType.START,
          time,
          index,
        },
        {
          value: highValue,
          edge: EdgeType.END,
          time,
          index,
        },
      ])
      .toSorted((a, b) => a.value - b.value || b.edge - a.edge);

    if (sortedData.length === 2) {
      this.domain.set("count", [0, 1]);
      this.boundEdges([
        [
          sortedData[0].value,
          {
            ...sortedData[1],
            count: 1,
            highValue: sortedData[1].value,
          },
        ],
      ]);
      return;
    }

    let { value: left, ...rest } = sortedData.shift()!;
    const treeSet = new TreeSet<typeof rest>((a, b) => a.index > b.index);
    treeSet.push(rest);
    const newEntries: Array<EntryType<typeof this.aggregateData>> = [];

    for (const { value: currentValue, ...current } of sortedData) {
      const maxCount = this.domain.get("count")![1];
      this.domain.set("count", [0, Math.max(maxCount, treeSet.size())]);

      const last = treeSet.empty() ? undefined : treeSet.begin().value;

      if (current.edge === EdgeType.START) {
        if (!last) {
          newEntries.push([
            left,
            {
              count: 0,
              time: epoch,
              index: -1,
              highValue: currentValue,
            },
          ]);
        } else {
          newEntries.push([
            left,
            {
              count: treeSet.size(),
              time: last.time,
              index: last.index,
              highValue: currentValue,
            },
          ]);
        }
        treeSet.push(current);
        left = currentValue;
        continue;
      }

      if (!last) {
        throw new Error("Invalid range slider data");
      }

      newEntries.push([
        left,
        {
          count: treeSet.size(),
          time: last.time,
          index: last.index,
          highValue: currentValue,
        },
      ]);

      treeSet.erase(current);
      left = currentValue;
    }

    this.boundEdges(newEntries);
  }

  insert(value: SliderValue, options: { caller?: Key; time?: Date } = {}) {
    const { caller } = options;
    const time = this.updateTime(options.time);
    const index = this.domain.get("index")![1] + 1;

    this.detailedData.set(index, { value, time, index });
    this.domain.set("index", [0, index]);

    const [lowValue, highValue] = value;

    if (this.detailedData.size === 1) {
      this.domain.set("count", [0, 1]);
      this.boundEdges([
        [
          lowValue,
          {
            count: 1,
            time,
            index,
            highValue,
          },
        ],
      ]);
      this.dispatchEvent(
        new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
          detail: { ...this, caller },
        })
      );
      return this;
    }

    const newEntries: Array<EntryType<typeof this.aggregateData>> = [];
    let startProcessed = false;
    let endProcessed = false;

    for (const [k, v] of this.aggregateData) {
      // inserted range starts in the middle of the current interval
      if (!startProcessed && !endProcessed && lowValue < v.highValue) {
        startProcessed = true;

        // 1st subinterval in the interval
        if (lowValue > k) {
          newEntries.push([
            k,
            {
              ...v,
              highValue: lowValue,
            },
          ]);
        }

        // 2nd subinterval in the interval
        newEntries.push([
          lowValue,
          {
            count: v.count + 1,
            time,
            index,
            highValue: Math.min(highValue, v.highValue),
          },
        ]);
        this.domain.set("count", [
          0,
          Math.max(this.domain.get("count")![1], v.count + 1),
        ]);

        // 3rd subinterval in the interval
        if (highValue < v.highValue) {
          newEntries.push([
            highValue,
            {
              ...v,
              highValue: v.highValue,
            },
          ]);
          endProcessed = true;
        }

        continue;
      }

      // inserted range ends in the middle of the current interval
      if (!endProcessed && highValue < v.highValue) {
        if (highValue > k) {
          newEntries.push([
            k,
            {
              count: v.count + 1,
              time,
              index,
              highValue,
            },
          ]);
          this.domain.set("count", [
            0,
            Math.max(this.domain.get("count")![1], v.count + 1),
          ]);
        }

        if (highValue < v.highValue) {
          newEntries.push([
            highValue,
            {
              ...v,
              highValue: v.highValue,
            },
          ]);
        }

        endProcessed = true;
        continue;
      }

      // current interval is either inside the inserted range or outside of it
      const increment = startProcessed && !endProcessed;

      if (increment) {
        newEntries.push([
          k,
          {
            ...v,
            count: v.count + 1,
            time,
            index,
          },
        ]);
        this.domain.set("count", [
          0,
          Math.max(this.domain.get("count")![1], v.count + 1),
        ]);
      } else {
        newEntries.push([k, v]);
      }
    }

    this.aggregateData = new Map(newEntries);
    this.dispatchEvent(
      new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
        detail: { ...this, caller },
      })
    );
    return this;
  }
}
