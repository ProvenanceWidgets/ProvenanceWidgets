import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import * as d3 from "d3";
import { AutoComplete } from "primeng/autocomplete";
import { convertRemToPixels, getTooltip, interpolateLightOranges, suffixed } from "../utils";
import { DEFAULT_HEIGHT, LINE_CIRCLE_DIAMETER, MODE } from "../constants";
import { OverlayPanel } from "primeng/overlaypanel";

interface TimeStampedValues {
    value: string;
    timestamp: Date;
}

interface TimeStampedCount {
    count: number;
    timestamp: Date;
    maxIndex: number;
}

interface AutoCompleteCompleteEvent {
    originalEvent: Event;
    query: string;
}

export type InputTextProvenance = {
    data: TimeStampedValues[];
    dictionary: Record<string, TimeStampedCount>;
    minTime?: Date;
    oldMaxTime?: Date;
    maxTime?: Date;
    minMsBetweenInteractions: number;
    revalidate?: boolean;
} | {
    revalidate: true;
    data: TimeStampedValues[];
}
@Component({
    selector: 'provenance-inputtext',
    templateUrl: './inputtext.component.html',
    styleUrls: ['./inputtext.component.scss']
})
export class InputtextComponent extends AutoComplete implements OnInit, AfterViewInit, OnDestroy {
    @Input() mode = MODE
    @Input() id = ""
    @Input() visualize = true
    @ViewChild("wrapper") wrapper!: ElementRef<HTMLDivElement>;
    @ViewChild("provenance") svg!: ElementRef<SVGSVGElement>;
    @ViewChild("provenanceButton") button!: ElementRef<HTMLButtonElement>;
    @Input() freeze = false
    @Input() override value: any
    @Output() valueChange = new EventEmitter()
    @Input() 
    get provenance() {
        return this._provenance
    }
    set provenance(value) {
        if (this._provenance && value?.revalidate) {
            this.setProvenance(value)
            this._visualize()
            return
        }
        this._provenance = value
    }
    _provenance?: InputTextProvenance
    @Output() provenanceChange = new EventEmitter<InputTextProvenance>();

    data: TimeStampedValues[] = []
    dictionary: Record<string, TimeStampedCount> = {}
    query = ""
    minTime: Date | undefined = undefined
    oldMaxTime: Date | undefined = undefined
    maxTime: Date | undefined = undefined
    minMsBetweenInteractions = Infinity
    interval = NaN
    hasUserInteracted = false
    tooltip = getTooltip()

    setProvenance(provenance: InputTextProvenance) {
        this.data = provenance.data
        if (!provenance.revalidate) {
            this.dictionary = provenance.dictionary
            this.minTime = provenance.minTime
            this.oldMaxTime = provenance.oldMaxTime
            this.maxTime = provenance.maxTime
            this.minMsBetweenInteractions = provenance.minMsBetweenInteractions
        } else {
            this.minTime = this.data[0].timestamp
            this.maxTime = this.data[this.data.length - 1].timestamp
            this.oldMaxTime = this.data.length > 1 ? this.data[this.data.length - 2].timestamp : this.data[0].timestamp
            this.minMsBetweenInteractions = Math.min(
                Infinity, (+this.maxTime) - (+this.oldMaxTime)
            )
            this.dictionary = this.data.reduce<Record<string, TimeStampedCount>>((acc, { value, timestamp }, i) => {
                acc[value] = {
                    count: (acc[value]?.count || 0) + 1,
                    timestamp,
                    maxIndex: i
                }
                return acc
            }, {})
        }
    }

    getProvenance(): InputTextProvenance {
        return {
            data: this.data,
            dictionary: this.dictionary,
            minTime: this.minTime,
            oldMaxTime: this.oldMaxTime,
            maxTime: this.maxTime,
            minMsBetweenInteractions: this.minMsBetweenInteractions
        }
    }

    ngOnInit() {
        this.tooltip = getTooltip()
        if (this.provenance?.data?.length) {
            this.setProvenance(this.provenance)
            this.value = this.data.slice(-1)[0].value
            this.hasUserInteracted = this.data.length > 0
            return
        }
        if (this.value) {
            const value = this.field ? this.value[this.field] : this.value
            const timestamp = new Date()
            this.minTime = timestamp
            this.oldMaxTime = timestamp
            this.maxTime = timestamp
            this.data = [{ value, timestamp }]
            this.dictionary[value] = {
                count: 1,
                timestamp,
                maxIndex: 0
            }
        }
    }

    ngAfterViewInit(): void {
        if (this.provenance?.data?.length) {
            this._visualize()
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy()
        clearInterval(this.interval)
    }

    handleKeyUp(event: KeyboardEvent) {
        if (event.key === "Enter") {
            this.handleEnter("enter")
        }
    }

    handleEnter(eventType: "click" | "enter" | "select") {
        this.tooltip.style("opacity", 0).style("display", "none")
        const value = this.wrapper.nativeElement.querySelector("input")?.value

        if (!value && value !== '') return

        this.value = value
        this.valueChange.emit(value)

        const timestamp = new Date()

        dispatchEvent(new CustomEvent("provenance-widgets", {
            detail: {
                id: this.id,
                widget: "inputtext",
                mode: this.mode,
                interaction: eventType,
                data: {
                    value,
                    timestamp
                }
            }
        }))

        if (this.freeze) return

        if (!this.minTime) this.minTime = timestamp

        if (this.maxTime)
            this.minMsBetweenInteractions = Math.min(this.minMsBetweenInteractions, (+timestamp) - (+this.maxTime!))

        this.oldMaxTime = this.maxTime || timestamp
        this.maxTime = timestamp

        const newEntry = { value, timestamp }
        const dataEntry = [newEntry]

        if (this.mode === "time")
            dataEntry.push(newEntry)

        this.data = [
            ...this.data,
            ...dataEntry
        ]

        this.dictionary[value] = {
            count: (this.dictionary[value]?.count || 0) + 1,
            timestamp,
            maxIndex: this.data.length - 1
        }

        if (this.mode === "time" && isNaN(this.interval)) {
            this.interval = setInterval(() => {
                const newTimeStamp = new Date()
                this.oldMaxTime = this.maxTime || newTimeStamp
                this.maxTime = newTimeStamp
                const lastEntry = this.data.slice(-1)[0]
                this.data = [
                    ...this.data.slice(0, -1),
                    {
                        value: lastEntry.value,
                        timestamp: newTimeStamp
                    }
                ]
                this._visualize()
            }, 1000) as any
        }

        this.hasUserInteracted = true

        const provenance = this.getProvenance()
        this.provenanceChange?.emit(provenance)
        this._visualize()
    }

    _visualize() {
        if (!this.visualize)
            return

        const self = this
        const width = this.wrapper.nativeElement.querySelector("input")!.offsetWidth

        const defaultTextHeight = parseInt(getComputedStyle(document.body).getPropertyValue("font-size")) || 13

        const timeDiff = (+this.maxTime!) - (+this.minTime!)

        const height = Math.max(
            defaultTextHeight * (
                this.mode === "interaction" ? this.data.length :
                    timeDiff / this.minMsBetweenInteractions
            ),
            DEFAULT_HEIGHT
        )

        const buttonWidth = this.button.nativeElement.offsetWidth

        const FLEX_GAP = convertRemToPixels(0.5)

        const svg = d3
            .select(this.svg.nativeElement)
            .attr("height", height + defaultTextHeight)
            .attr("width", `${width + buttonWidth + FLEX_GAP}px`)

        const svgg = svg
            .select("g.body")
            .attr("transform", `translate(${buttonWidth + FLEX_GAP}, ${defaultTextHeight / 2})`)

        const y = this.mode === "interaction" ?
            d3.scaleLinear()
                .domain([0, this.data.length - 1])
                .range([0, height]) :
            d3.scaleTime()
                .domain([this.minTime!, this.maxTime!])
                .range([0, height])

        const yAxis = d3.axisLeft(y.nice())

        if (this.mode !== "interaction")
            yAxis.tickValues([this.minTime!, this.maxTime!]).tickFormat((_,i) => i === 0 ? "t=0" : "now")

        const axisG = d3.select(this.svg.nativeElement).select("g.axis")

        axisG
            .select("text")
            .attr("x", -(DEFAULT_HEIGHT + defaultTextHeight) / 2)

        axisG
            .attr("transform", `translate(${buttonWidth + FLEX_GAP}, ${defaultTextHeight / 2})`)
            .call(yAxis as any)

        const line = d3.line<TimeStampedValues>()
            .x(LINE_CIRCLE_DIAMETER / 2)
            .y((d, i) => y(this.mode === "interaction" ? i : d.timestamp))

        const color = d3
            .scaleSequential(interpolateLightOranges)
            .domain(this.mode === "interaction" ? 
                [0, this.data.length - 1] :
                [this.minTime!, this.maxTime!]
            )

        svgg
            .selectAll("path")
            .data([this.data])
            .join("path")
            .transition()
            .duration(250)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 2)

        svgg
            .selectAll("circle")
            .data(this.data)
            .join("circle")
            .attr("psvgi", (_, i) => i)
            .on("click", (_, d) => {
                this.value = d.value
                this.wrapper.nativeElement.querySelector("input")!.value = d.value
                this.handleEnter("click")
            })
            .on("mouseover", function (e, d) {
                const { clientX: x, clientY: y } = e
                self.tooltip
                    .style("opacity", 1)
                    .style("display", "block")
                    .style("left", `${x + 10}px`)
                    .style("top", `${y + 10}px`)
                    .select("div")
                    .html(`
                        Label: ${self.el?.nativeElement?.dataset?.label || self.id} <br />
                        ${suffixed(+d3.select(this).attr("psvgi"))}/${suffixed(self.data.length - 1)} search <br />
                        <span>Searched value: ${d.value}</span>
                        <br />
                        <span>Searched at: ${d.timestamp.toLocaleString()}</span>
                    `)

                dispatchEvent(new CustomEvent("provenance-widgets", {
                    detail: {
                        id: self.id,
                        widget: "inputtext",
                        mode: self.mode,
                        interaction: "hover",
                        data: {
                            value: d.value,
                            timestamp: d.timestamp,
                            index: d3.select(this).attr("psvgi")
                        }
                    }
                }))
            })
            .on("mouseout", () => self.tooltip.style("opacity", 0).style("display", "none"))
            .transition()
            .duration(250)
            .attr("cx", LINE_CIRCLE_DIAMETER / 2)
            .attr("cy", (d, i) => y(this.mode === "interaction" ? i : d.timestamp))
            .attr("r", LINE_CIRCLE_DIAMETER / 2)
            .attr("fill", (d: TimeStampedValues, i) => color(this.mode === "interaction" ? i : d.timestamp))
            .attr("stroke", "black")
            .style("cursor", "pointer")

        svgg
            .selectAll("text")
            .data(this.data)
            .join("text")
            .transition()
            .duration(250)
            .attr("x", LINE_CIRCLE_DIAMETER + 4)
            .attr("y", (d, i) => y(this.mode === "interaction" ? i : d.timestamp) + defaultTextHeight / 4)
            .text((d: TimeStampedValues) => d.value || "<empty>")
    }

    handleSearch(event: AutoCompleteCompleteEvent) {
        this.query = event.query
    }

    getSuggestions() {
        if (!this.wrapper?.nativeElement)
            return []

        const width = this.wrapper.nativeElement.querySelector<HTMLInputElement>("input")!.offsetWidth - convertRemToPixels(2.5)
        const resultSet = Object.entries(this.dictionary)
            .filter(([key]) => key.includes(this.query))
            .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime())
        
        const timeDomain = d3.extent(resultSet, ([, { timestamp }]) => timestamp) as [Date, Date]
        const interactionDomain = d3.extent(resultSet, ([, { maxIndex }]) => maxIndex) as [number, number]
        const countDomain = [0, d3.max(resultSet, ([, { count }]) => count) as number]
        const x = d3.scaleLinear().domain(countDomain).range([0, width])
        const color = d3
            .scaleSequential(interpolateLightOranges)
            .domain(this.mode === "interaction" ? interactionDomain : timeDomain)

        return resultSet.map(([key, { count, timestamp, maxIndex }]) => ({
            label: key,
            count,
            timestamp,
            color: color(this.mode === "interaction" ? maxIndex : timestamp),
            width: x(count)
        }))
    }

    handleClear(autocomplete: AutoComplete, event: any) {
        autocomplete.value = ""
        autocomplete.handleDropdownClick(event)
    }

    handleMouseOver(event: MouseEvent, suggestion: any) {
        if (!this.visualize)
            return
        const { clientX: x, clientY: y } = event
        this.tooltip
            .style("opacity", 1)
            .style("display", "block")
            .style("left", `${x + 10}px`)
            .style("top", `${y + 10}px`)
            .select("div")
            .html(`
                <span>Label: ${this.el?.nativeElement?.dataset?.label || this.id}</span>
                <br />
                <span>Searched value: ${suggestion.label}</span>
                <br />
                <span>Last searched at: ${suggestion.timestamp.toLocaleString()}</span>
                <br />
                <span># times searched: ${suggestion.count}</span>
            `)
    }

    handleMouseOut() {
        this.tooltip.style("opacity", 0).style("display", "none")
    }

    handleProvenanceButtonClick(event: MouseEvent, target: any, op: OverlayPanel) {
        dispatchEvent(new CustomEvent("provenance-widgets", {
            detail: {
                id: this.id,
                widget: "inputtext",
                mode: this.mode,
                interaction: "provenance-button-click",
                initialProvenanceMode: op.overlayVisible ? "temporal" : "aggregate"
            }
        }))
        op.toggle(event, target)
    }
}