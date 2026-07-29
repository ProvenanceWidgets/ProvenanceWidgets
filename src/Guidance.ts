export type Key = string | number | Symbol;
export default interface Guidance<AV, DV, SV, AK = Key, DK extends Key = Key>
  extends EventTarget {
  domain?: Map<keyof (AV & DV), number[]>;
  aggregateData?: Map<AK, AV>;
  detailedData?: Map<DK, DV>;

  insert?(
    value: AK | Iterable<AK>,
    options: { caller?: Key } & Partial<AV>
  ): this;

  suggestions?: SV[];

  // Should be strictened eventually
  accept?(suggestions?: SV[]): void;
  reject?(suggestions?: SV[]): void;
  mute?(...args: any[]): any;
}
