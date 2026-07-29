import { Key } from "../../Guidance";
import Provenance, { TemporalRecord } from "./Provenance";
import GenericProvenance from "./GenericProvenance";
import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";

export enum WidgetType {
    SLIDER = "SLIDER",
    DROPDOWN = "DROPDOWN",
    CHECKBOX = "CHECKBOX",
    MULTISELECT = "MULTISELECT",
    RADIOBUTTON = "RADIOBUTTON",
    INPUTTEXT = "INPUTTEXT",
}

export interface AggregateWidgetsRecord extends TemporalRecord {
    interactions: number;
}

export interface TemporalValue {

}

interface WidgetOptions {
    color: string
}

interface RegisteredWidget {
    options?: WidgetOptions,
    // Here, `any` should be replaced with all the types of provenance we support.
    widget: GenericProvenance<any>,
    type: WidgetType
}

export default class SuperProvenance extends Provenance<
    AggregateWidgetsRecord,
    TemporalRecord[]
> {
    registeredWidgets: Map<string, RegisteredWidget>;

    constructor() {
        super();
        this.registeredWidgets = new Map();
    }

    /**
     * @description Registers a new provenance widget in the class.
     * 
     * @usage const sp = new SuperProvenance()
     *        
     *        sp.register(numberProvenance)
     */
    register<T extends Key>(key: string, widget: GenericProvenance<T>, options?: WidgetOptions) {
        this.registeredWidgets.set(key, {
            widget,
            options,
            type: WidgetType.INPUTTEXT
        });

        widget.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, () => {
            this.insert(key)
        })
    }

    insert(value: string, options: { caller?: Key; time?: Date } = {}) {
        const time = this.updateTime(options.time);
        const index = this.domain.get("index")![1] + 1;

        this.domain.set("index", [0, index]);

        this.detailedData.set(value, this.detailedData.get(value) ?? []);
        this.detailedData.get(value)!.push({
            time,
            index
        });

        this.dispatchEvent(
            new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
                detail: { ...this },
            })
        );

        return this;
    }
}