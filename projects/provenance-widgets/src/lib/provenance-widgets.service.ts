import { Options, LabelType, ChangeContext } from '@angular-slider/ngx-slider';
import { ElementRef, EventEmitter, Injectable } from '@angular/core';
import * as d3 from 'd3';
import { MODE } from './constants';
import { getTooltip, interpolateLightOranges } from './utils';
import isEqual from 'lodash.isequal'

interface EventDateIndex {
  date: Date
  index: number
}
interface Events {
  select?: EventDateIndex
  unselect?: EventDateIndex
}

export interface RangeSliderEvent {
  originalEvent: MouseEvent
  values: number[]
}

export type Provenance = {
  dataByOption: Record<string, Events[]>
  minTime: Date | undefined
  oldMaxTime: Date | undefined
  maxTime: Date | undefined
  events: number
  hasUserInteracted: boolean
  selections: { value: string[]; timestamp: Date }[]
  revalidate?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class ProvenanceWidgetsService {

  dataByOption: Record<string, Events[]> = {}
  selections: { value: string[]; timestamp: Date }[] = []
  minTime: Date | undefined = undefined
  oldMaxTime: Date | undefined = undefined
  maxTime: Date | undefined = undefined
  events = 0
  myId: string
  self?: ElementRef
  crosshairTarget?: any
  provenanceMode: "aggregate" | "temporal" = "aggregate"
  mode!: typeof MODE
  width!: number
  height!: number
  margin?: string
  temporalFilterRange = [0, 100]
  crosshairSelect!: (keys: string[]) => Provenance | undefined | void
  visType?: "multiselect" | "select" | "radio" | "checkbox"
  tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
  hasUserInteracted = false
  options = 0
  interaction = "external"
  temporalRectKV?: [string, Events] 

  resetInteraction() {
    this.interaction = "external"
  }
  
  temporalOptions: Options = {
    floor: 0,
    ceil: 100,
    hidePointerLabels: true,
    translate: (value: number, label: LabelType): string => {
      switch(label) {
        case LabelType.Floor:
          return this.mode === "interaction" ? "n=0" : "t=0"
        case LabelType.Ceil:
          return "now"
        default:
          return `${value}`
      }
    }
  }

  constructor() {
    this.myId = crypto.randomUUID()
    this.tooltip = getTooltip()
  }

  setTemporalRange(change: ChangeContext) {
    this.temporalFilterRange = [change.value, change.highValue!]
    dispatchEvent(new CustomEvent("provenance-widgets", {
      detail: {
        id: this.self?.nativeElement.id,
        widget: this.visType,
        mode: this.mode,
        interaction: "brush-end",
        data: {
          selection: this.temporalFilterRange,
        }
      }
    }))
    this._visualize()
  }

  init(el: ElementRef, crosshairTarget?: any, visType?: typeof this.visType) {
    if (el?.nativeElement?.style?.position)
      el.nativeElement.style.position = "relative"
    this.self = el
    this.crosshairTarget = crosshairTarget
    this.visType = visType
  }

  setElement(el: ElementRef) {
    if (el?.nativeElement?.style?.position)
      el.nativeElement.style.position = "relative"
    this.self = el
  }

  resetProvenance() {
    this.dataByOption = {}
    this.selections = []
    this.minTime = undefined
    this.oldMaxTime = undefined
    this.maxTime = undefined
    this.events = 0
    this.hasUserInteracted = false
    const selector = this.crosshairTarget ? document.querySelector(this.crosshairTarget) : this.self?.nativeElement
    d3.select(selector).selectAll("rect").remove()
  }

  setProvenance(provenance: Provenance) {
    if (!provenance.revalidate) {
      this.dataByOption = provenance.dataByOption
      this.minTime = provenance.minTime
      this.oldMaxTime = provenance.oldMaxTime
      this.maxTime = provenance.maxTime
      this.events = provenance.events
      this.hasUserInteracted = provenance.hasUserInteracted
      this.selections = provenance.selections
      return
    }
    this.resetProvenance()
    const selections = provenance.selections
    for (let i = 0; i < selections.length; i++) {
      this.addSimultaneousEvents(
        selections[i - 1]?.value,
        selections[i].value,
        false,
        false,
        selections[i].timestamp
      )
    }
    this.hasUserInteracted = true
  }

  getProvenance(): Provenance {
    return {
      dataByOption: this.dataByOption,
      minTime: this.minTime,
      oldMaxTime: this.oldMaxTime,
      maxTime: this.maxTime,
      events: this.events,
      hasUserInteracted: this.hasUserInteracted,
      selections: this.selections
    }
  }

  toggleProvenanceMode(btn: HTMLButtonElement, vis = true) {
    dispatchEvent(new CustomEvent("provenance-widgets", {
      detail: {
        id: this.self?.nativeElement.id,
        widget: this.visType,
        mode: this.mode,
        interaction: "provenance-button-click",
        initialProvenanceMode: this.provenanceMode,
      }
    }))    
    this.provenanceMode = this.provenanceMode === "aggregate" ? "temporal" : "aggregate"
    d3
      .select(btn)
      .selectChild("span")
      .attr("class", `p-button-icon pi pi-${this.provenanceMode === "aggregate" ? "history" : "chart-bar"}`)
      .style("transform", `rotate(${this.provenanceMode === "aggregate" ? "0" : "90deg"})`)
    
    Object
      .entries(this.dataByOption)
      .forEach(([key]) => {
        const id = this.myId + key
        const svg = d3.select(document.getElementById(id)!)
        svg
          .selectAll("rect")
          .remove()
      })
    if (vis) {
      this._visualize()
    }
  }

  // Do not call this method directly, use addSimultaneousEvents instead
  addEvent(key: string, event: "select" | "unselect", time: Date) {

    if (this.minTime === undefined) {
      this.minTime = time
    }
    this.oldMaxTime = this.maxTime || this.minTime
    this.maxTime = time

    if (this.dataByOption[key] === undefined) {
      this.dataByOption[key] = [{
        "select": {
          date: time,
          index: this.events
        }
      }]
      return
    }
    const len = this.dataByOption[key].length
    const last = this.dataByOption[key][len - 1]
    if (event === "select") {
      // CASE: Two selects in a row, do nothing
      if (!last["unselect"]) {
        return
      }
      // CASE: Select after unselect, create a new entry
      this.dataByOption[key].push({
        [event]: {
          date: time,
          index: this.events
        }
      })
    } else {
      // CASE: Two unselects in a row, do nothing
      if (!last["select"]) {
        return
      }
      // CASE: Unselect after select, update the last entry
      last[event] = {
        date: time,
        index: this.events
      }
    }
  }

  addSimultaneousEvents(
    oldValues: string[],
    newValues: string[],
    freeze: boolean,
    hasUserInteracted: boolean,
    time = new Date(),
    emitter?: EventEmitter<Provenance>,
    visualize?: () => void
  ) {
    const oldSet = new Set(freeze ? oldValues : this.selections.at(-1)?.value)
    const newSet = new Set(newValues)
    const symDiff = new Set(
      [...oldSet].filter(x => !newSet.has(x)).concat(
        newValues.filter(x => !oldSet.has(x))
      )
    )
    const selected = [...symDiff].filter(v => newSet.has(v))
    const unselected = [...symDiff].filter(v => oldSet.has(v))
    if (hasUserInteracted) {
      this.hasUserInteracted = true
      dispatchEvent(new CustomEvent("provenance-widgets", {
        detail: {
          id: this.self?.nativeElement.id,
          widget: this.visType,
          mode: this.mode,
          interaction: this.interaction,
          data: {
            selected,
            unselected,
            timestamp: new Date(),
            interaction: this.events + 1
          }
        }
      }))
    }
    if (freeze)
      return 
    unselected.forEach((key) => {
      this.addEvent(key, "unselect", time)
    })
    selected.forEach((key) => {
      this.addEvent(key, "select", time)
    })
    this.selections.push({ value: newValues, timestamp: time })
    this.events++
    this.interaction = "external"
    emitter?.emit(this.getProvenance())
    visualize?.()
  }

  visualize(mode: typeof MODE, width: number, height: number, margin?: string) {
    this.mode = mode
    this.width = width
    this.height = height
    this.margin = margin
    this._visualize()
  }

  private _visualize() {
    if (!this.minTime)
      return
    const mode = this.mode
    const width = this.width
    const height = this.height
    const margin = this.margin
    const scaleFilterToDate = d3.scaleLinear().domain([0, 100]).range([this.minTime!, this.maxTime!] as any) as any
    const scaleFilterToEvents = d3.scaleLinear().domain([0, 100]).range([0, this.events])
    const temporalDateRange: Date[] = this.temporalFilterRange.map(scaleFilterToDate)
    const temporalEventRange = this.temporalFilterRange.map(scaleFilterToEvents)
    const x = mode === "interaction" ? d3.scaleLinear().domain(temporalEventRange) : d3.scaleTime().domain(temporalDateRange)

    x.range([0, width])

    const aggX = d3
      .scaleLinear()
      .domain([0, d3.max(
          Object.values(this.dataByOption), 
          d => this.visType === "radio" || this.visType === "select" ?
          d.length :
          d.reduce((a, v) => a + (v.unselect ? 1 : 0) + 1, 0)
        )!
      ]).range([0, width])

    const color = d3
      .scaleSequential(interpolateLightOranges)
      .domain(
        mode === "interaction" ?
        [0, this.events] :
        [this.minTime!.getTime(), this.maxTime!.getTime()]
      )

    const selector = this.crosshairTarget ? document.querySelector(this.crosshairTarget) : this.self?.nativeElement

    let left = selector.offsetWidth - width// - (this.margin ? 0 : convertRemToPixels(1.25))
    if (!this.margin)
      left -= 40
    if (this.visType === "multiselect")
      left -= 22
    
    Object
      .entries(this.dataByOption)
      .forEach(([key, value], keyIndex) => {
        const id = this.myId + key
        const svg = d3.select(document.getElementById(id)!)
        svg
          .attr("width", width)
          .attr("height", height)
          .style("margin", margin || "0")
        if (this.provenanceMode === "aggregate") {
          let rect:d3.Selection<SVGRectElement, unknown, null, undefined> = svg
            .select("rect")
  
          if (rect.empty()) {
            rect = svg
              .append("rect")
          }
          
          const last = value[value.length - 1]
          const selectDate = last.select?.date.getTime() || 0
          const unselectDate = last.unselect?.date?.getTime() || 0
          const ev = this.visType === "radio" || this.visType === "select" ? "select" : "interact"
          const date = this.visType === "radio" || this.visType === "select" ? selectDate : Math.max(selectDate, unselectDate)

          rect
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", aggX(
              this.visType === "radio" || this.visType === "select" ?
              value.length :
              value.reduce((a, v) => a + (v.unselect ? 1 : 0) + 1, 0)
            ))
            .attr("height", height)
            .attr("fill", color(mode === "interaction" ? last.unselect?.index || last.select?.index! : date))
            .attr("stroke", "black")
            .attr("stroke-width", date >= this.oldMaxTime?.getTime()! ? 2 : 0)
            .attr("stroke-dasharray", date === this.maxTime?.getTime() ? "0 0" : "4 1")
            
          d3.select(svg.node()?.parentElement!)
            .on("mouseover", (e) => {
              if (this.provenanceMode === "temporal")
                return
              dispatchEvent(new CustomEvent("provenance-widgets", {
                detail: {
                  id: this.self?.nativeElement.id,
                  widget: this.visType,
                  mode: this.mode,
                  interaction: "aggregate-rect-hover",
                  data: {
                    key,
                    value: value.map(v => ({
                      select: v.select,
                      unselect: v.unselect
                    }))
                  }
                }
              }))

              const { clientX: x, clientY: y } = e

              this.tooltip
                .style("opacity", 1)
                .style("display", "block")
                .style("left", `${x + 10}px`)
                .style("top", `${y + 10}px`)
                .select("div")
                .html(`
                  Label: ${this.self?.nativeElement?.dataset?.label || this.self?.nativeElement.id} <br/>
                  Selected value: ${key}<br/>
                  # times ${["select", "radio"].some(v => v === this.visType) ? `selected: ${value.length}` : `interacted: ${value.reduce((a, v) => a + (v.unselect ? 1 : 0) + 1, 0)}`}<br/>
                  Last ${ev}ed at: ${(new Date(date)).toLocaleString()}<br/>                  
                `)
            })
            .on("mouseout", () => {
              this.tooltip
                .style("opacity", 0)
                .style("display", "none")
            })
        } else {
          svg
            .selectAll("rect")
            .data(value)
            .join("rect")
            .attr("x", d => x(d.select![mode === "interaction" ? "index" : "date"]))
            .attr("y", 0)
            .attr("width", d =>
              x(
                mode === "interaction" ?
                  d.unselect?.index || this.events
                  :
                  d.unselect?.date || this.maxTime!
              )
              -
              x(
                mode === "interaction" ?
                  d.select!.index :
                  d.select!.date
              )
            )
            .attr("height", height)
            .attr("fill", (v, i, a) => i === a.length - 1 ? 
              color(mode === "interaction" ? 
                v.unselect?.index || this.events : 
                v.unselect?.date || this.maxTime!
              ) :
              "#E5E5E5"
            )
            .attr("opacity", 1)
            .attr("data-key", key)
            .attr("data-value", d => JSON.stringify(d, null, '\t'))
            .attr("data-index", keyIndex)

            d3.select(svg.node()?.parentElement!)
            .on("mouseout", () => {
              this.tooltip
                .style("opacity", 0)
                .style("display", "none")
            })
            .on("mousemove", (e) => {
              let [mouse_x] = d3.pointer(e)
              mouse_x -= left
              let [rects, unselectedRects] = d3
                .select(selector)
                .selectAll("rect")
                .nodes()
                .reduce<[SVGRectElement[], SVGRectElement[]]>((acc, rect: any) => {
                  const x = parseInt(rect.getAttribute("x")!)
                  const width = parseInt(rect.getAttribute("width")!)
                  if (x <= mouse_x && x + width >= mouse_x) {
                    acc[0].push(rect)
                  } else {
                    acc[1].push(rect)
                  }
                  return acc
                }, [[],[]])

              if (rects.every((rect: any) => rect.getAttribute("data-key") !== key)) {
                rects = []
                unselectedRects = d3
                  .select(selector)
                  .selectAll("rect")
                  .nodes() as SVGRectElement[]
              }

              d3
                .selectAll(rects)
                .style("stroke", "var(--blue-500)")

              d3
                .selectAll(unselectedRects)
                .style("stroke", "none")

              const keys = new Set<string>(
                rects.map((rect: any) => rect.getAttribute("data-key")!)
              )

              for (const key of Object.keys(this.dataByOption)) {
                let parent = document.getElementById(`${this.myId}${key}`)?.parentElement
                if (!parent)
                  continue
                if (this.crosshairTarget)
                  parent = parent.parentElement!
                const inputParent = d3
                  .select(parent)
                  .selectChildren()
                  .nodes()
                  .filter((e: any) => e.id !== `${this.myId}${key}`)[0]
                let child = d3
                  .select(inputParent)
                  .selectChild()
                if (!this.crosshairTarget) {
                  child = child.select("div:nth-child(2)")
                }
                child.style("border-color", keys.has(key) ? "var(--blue-500)" : "#ced4da")
              }

              const rect = rects.find((rect: any) => rect.getAttribute("data-key") === key)

              if (!rect) {
                this.temporalRectKV = undefined
                this.tooltip
                  .style("opacity", 0)
                  .style("display", "none")
                return
              }

              const d = JSON.parse(rect.getAttribute("data-value")!) as Events

              const startDate = new Date(d.select!.date)
              const endDate = new Date(d.unselect?.date || new Date())
              let selectionTime: string|number = d3.timeSecond.count(startDate, endDate)
              if (selectionTime > 60)
                selectionTime = d3.timeMinute.count(startDate, endDate) + "m"
              else {
                selectionTime = selectionTime + "s"
              }

              const { clientX: x, clientY: y } = e

              this.tooltip
                .style("opacity", 1)
                .style("display", "block")
                .style("left", `${x + 10}px`)
                .style("top", `${y + 10}px`)
                .select("div")
                .html(`
                  Label: ${this.self?.nativeElement?.dataset?.label || this.self?.nativeElement.id} <br/>
                  Selected value: ${key}<br/>
                  Selected at: ${startDate.toLocaleString()}
                  ${d.unselect ? `<br/>Unselected at: ${new Date(d.unselect.date).toLocaleString()}` : ""}<br/>
                  Selected for: ${selectionTime}
                `)

                const kv = [key, d] as [string, Events]
                if (isEqual(kv, this.temporalRectKV)) {
                  return
                }
                this.temporalRectKV = kv
                dispatchEvent(new CustomEvent("provenance-widgets", {
                  detail: {
                    id: this.self?.nativeElement.id,
                    widget: this.visType,
                    mode: this.mode,
                    interaction: "temporal-rect-hover",
                    data: {
                      key,
                      value: d
                    }
                  }
                }))
            })
            .on("click", (e) => {
              e.preventDefault()
              e.stopPropagation()
              let [mouse_x] = d3.pointer(e)
              mouse_x -= left
              const rects = d3
                .select(selector)
                .selectAll("rect")
                .nodes()
                .filter((rect: any) => {
                  const x = parseInt(rect.getAttribute("x")!)
                  const width = parseInt(rect.getAttribute("width")!)
                  return x <= mouse_x && x + width >= mouse_x
                })

              if (rects.every((rect: any) => rect.getAttribute("data-key") !== key)) {
                return
              }

              const keys = new Set<string>(
                rects.map((rect: any) => rect.getAttribute("data-key")!)
              )
              this.interaction = "temporal-rect-click"
              this.crosshairSelect([...keys])
            })
        }
      })
  }
}
