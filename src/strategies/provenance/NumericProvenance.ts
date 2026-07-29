import { Optional } from "../../utils";
import GenericProvenance from "./GenericProvenance";
import { TemporalValueRecord } from "./Provenance";

export default class NumericProvenance extends GenericProvenance<number> {
  minValue: number;
  maxValue: number;
  constructor(
    minValue: number,
    maxValue: number,
    temporalData: Optional<TemporalValueRecord<number>, "index">[] = []
  ) {
    super(temporalData);
    this.minValue = minValue;
    this.maxValue = maxValue;
  }
}
