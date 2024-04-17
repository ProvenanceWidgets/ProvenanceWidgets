import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, Output, ViewChild, EventEmitter, ChangeDetectorRef, NgZone, Renderer2 } from '@angular/core';
import { ChangeContext, SliderComponent as NgxSliderComponent } from '@angular-slider/ngx-slider'
import * as d3 from 'd3'
import { DEFAULT_HEIGHT, LINE_CIRCLE_DIAMETER, MODE } from '../constants';
import { convertRemToPixels, getTooltip, interpolateLightOranges, suffixed } from '../utils';
import { OverlayPanel } from 'primeng/overlaypanel';

interface TimeStampedValues {
  value: number[];
  timestamp: Date;
  actualIndex?: number;
}

interface Bucket {
  date: Date;
  count: number;
  highValue?: number;
  maxIndex?: number;
}

export type SliderProvenance = {
  data: TimeStampedValues[];
  minTime: Date;
  oldMaxTime: Date;
  maxTime: Date;
  maxFrequency: number;
  buckets: Map<number, Bucket>;
  value: number;
  highValue: number;
  revalidate?: boolean;
} | {
  data: TimeStampedValues[];
  revalidate: true;
}

@Component({
  selector: 'provenance-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./overlaypanel.component.scss', './slider.component.scss']
})
export class SliderComponent extends NgxSliderComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() mode = MODE
  @Input() id = ""
  @Input() 
  get provenance() {
    return this._provenance
  }
  set provenance(value) {
    if (this.provenance && value?.revalidate) {
      this._provenance = value
      this.revalidateProvenance(value)
      this._visualize()
    }
    this._provenance = value
  }
  _provenance?: SliderProvenance
  @Input() visualize = true
  @Input() freeze = false
  @Output() provenanceChange = new EventEmitter<SliderProvenance>();
  @Output() selectedChange = new EventEmitter<ChangeContext>();
  @ViewChild("wrapper") wrapper!: ElementRef<HTMLDivElement>;
  @ViewChild("provenance") provenanceSvg!: ElementRef<SVGSVGElement>;
  @ViewChild("aggregate") aggregateSvg!: ElementRef<SVGSVGElement>;
  @ViewChild("provenanceButton") pButton!: ElementRef<HTMLButtonElement>;

  data: TimeStampedValues[] = []
  minTime: Date | undefined = undefined
  oldMaxTime: Date | undefined = undefined
  maxTime: Date | undefined = undefined
  maxFrequency = 0
  interval = NaN
  sliderHeight = 0
  brush!: d3.BrushBehavior<unknown>
  filterStart?: number | Date
  filterEnd?: number | Date
  buckets: Map<number, Bucket> = new Map()
  el: ElementRef

  constructor(renderer: Renderer2, elementRef: ElementRef, changeDetectionRef: ChangeDetectorRef, zone: NgZone) {
    super(renderer, elementRef, changeDetectionRef, zone, false)
    this.el = elementRef
  }

  initBuckets(date: Date, value = this.value, highValue = this.highValue) {
    this.buckets.set(value, {
      date,
      count: 1,
      highValue: highValue,
      maxIndex: 0
    })
    if (highValue != null) {
      // enables 100% slider coverage
      if (this.options.floor! < value) {
        this.buckets.set(this.options.floor!, {
          date,
          count: 0,
          highValue: value
        })
      }
      if (this.options.ceil! > highValue) {
        this.buckets.set(highValue, {
          date,
          count: 0,
          highValue: this.options.ceil!
        })
      }
    }
    this.maxFrequency = 1
  }

  addBucket(date: Date, value: number, highValue?: number) {
    if (highValue == null) {
      this.buckets.set(value, {
        date,
        count: (this.buckets.get(value)?.count || 0) + 1,
        maxIndex: this.data.length - 1
      })
      this.maxFrequency = Math.max(this.maxFrequency, this.buckets.get(value)!.count)

      return
    }

    const buckets = Array.from(this.buckets.entries()).sort((a, b) => a[0] - b[0])

    let newBuckets: typeof buckets = []
    let startProcessed = false
    let endProcessed = false

    buckets.forEach(([k, v]) => {
      // interval start is in a bucket
      if (!startProcessed && !endProcessed && value < v.highValue!) {
        startProcessed = true
        // 1st sub-interval in the bucket
        if (value > k) {
          newBuckets.push([k, {
            ...v,
            highValue: value
          }])
        }

        // 2nd sub-interval in the bucket
        newBuckets.push([value, {
          date,
          count: v.count + 1,
          highValue: Math.min(highValue, v.highValue!),
          maxIndex: this.data.length - 1
        }])
        this.maxFrequency = Math.max(this.maxFrequency, v.count + 1)

        // If the interval end is also in the bucket, we need to add a 3rd sub-interval
        if (highValue < v.highValue!) {
          newBuckets.push([highValue, {
            ...v,
            highValue: v.highValue
          }])
          endProcessed = true
        }

        return
      }

      // interval end is in bucket, but start is not
      if (!endProcessed && highValue <= v.highValue!) {
        if (highValue > k) {
          newBuckets.push([k, {
            date,
            count: v.count + 1,
            highValue: highValue,
            maxIndex: this.data.length - 1
          }])
          this.maxFrequency = Math.max(this.maxFrequency, v.count + 1)
        }
        // 2nd sub-interval, if bucket end != interval end
        if (highValue < v.highValue!) {
          newBuckets.push([highValue, {
            ...v,
            highValue: v.highValue
          }])
        }
        endProcessed = true
        return
      }

      // either the bucket is completely inside the interval or before/after the interval
      const increment = startProcessed && !endProcessed
      newBuckets.push([k, increment ? {
        ...v,
        count: v.count + 1,
        date,
        maxIndex: this.data.length - 1
      } : v])

      if (increment)
        this.maxFrequency = Math.max(this.maxFrequency, v.count + 1)
    })
    this.buckets = new Map(newBuckets)
  }

  resetProvenance() {
    this.data = []
    this.minTime = undefined
    this.oldMaxTime = undefined
    this.maxTime = undefined
    this.maxFrequency = 0
    this.buckets = new Map()
  }

  revalidateProvenance(provenance: SliderProvenance) {
    this.resetProvenance()
    const pdata = provenance.data
    const first = pdata[0]
    const last = pdata[pdata.length - 1]

    this.data.push(first)
    this.initBuckets(first.timestamp, first.value[0], first.value[1])

    pdata.slice(1).forEach(v => {
      this.data.push(v)
      this.addBucket(v.timestamp, v.value[0], v.value[1])
    })

    this.minTime = first.timestamp
    this.maxTime = last.timestamp
    this.oldMaxTime = pdata.length > 1 ? pdata[pdata.length - 2].timestamp : first.timestamp
    this.value = last.value[0]
    this.highValue = last.value[1]
  }

  override ngOnInit(): void {
    this.options = {
      ...this.options,
      floor: this.options.floor || 0,
      ceil: this.options.ceil || 100,
      step: this.options.step || 1,
    }
    if (this.provenance?.data?.length) {
      if (this.provenance.revalidate) {
        this.revalidateProvenance(this.provenance)
      } else {
        this.data = this.provenance.data
        this.minTime = this.provenance.minTime
        this.oldMaxTime = this.provenance.oldMaxTime
        this.maxTime = this.provenance.maxTime
        this.maxFrequency = this.provenance.maxFrequency
        this.buckets = this.provenance.buckets
        this.value = this.provenance.value
        this.highValue = this.provenance.highValue
      }
      return
    }
    const newDate = new Date()
    this.minTime = newDate
    this.data = [
      {
        value: this.highValue == null ? [this.value] : [this.value, this.highValue],
        timestamp: newDate
      }
    ]
    this.initBuckets(newDate)
  }

  override ngAfterViewInit(): void {
    // DO NOT CALL super.ngAfterViewInit() or REMOVE THIS METHOD
    if (this.provenance?.data?.length) {
      this._visualize()
    }
  }

  override ngOnDestroy() {
    clearInterval(this.interval)
  }

  private draw(
    xScale: d3.ScaleLinear<number, number, never>,
    yScale: d3.ScaleLinear<number, number, never> | d3.ScaleTime<number, number, never>,
    index: 0 | 1,
    data: TimeStampedValues[],
  ) {
    const self = this
    const pSvg = d3.select(this.provenanceSvg.nativeElement)
    const aSvg = d3.select(this.aggregateSvg.nativeElement)
    const y = yScale.copy()
    const aggY = d3.scaleLinear().domain([0, this.maxFrequency]).range([0, this.sliderHeight - 2])
    const color = d3
      .scaleSequential(interpolateLightOranges)
      .domain(
        this.mode === "interaction" ?
          [0, this.data.length - 1] :
          [this.minTime!.getTime(), this.maxTime!.getTime()]
      )

    aSvg
      .select("g")
      .selectAll("rect")
      .remove()

    // sort by timestamp, lowest first
    const buckets = Array.from(this.buckets.entries()).sort((a, b) => a[1].date.getTime() - b[1].date.getTime())

    const tooltip = getTooltip()

    aSvg
      .selectAll("rect")
      .data(buckets)
      .join("rect")
      .attr("x", ([key]) => xScale(+key))
      .attr("y", ([_, value]) => this.sliderHeight - aggY(value.count))
      .attr("width", ([key, value]) => this.highValue != null ? xScale((this.options.floor || 0) + value.highValue! - (+key)) : 8)
      .attr("height", ([_, value]) => aggY(value.count))
      .attr("fill", ([_, value]) => color(this.mode === "interaction" ? value.maxIndex! : value.date.getTime()))
      .attr("stroke", "black")
      .attr("stroke-width", ([_, value]) => value.date.getTime() >= this.oldMaxTime?.getTime()! ? 2 : 0)
      .attr("stroke-dasharray", ([_, value]) => value.date.getTime() === this.oldMaxTime?.getTime() ? "4 1" : "0 0")
      .on("click", (_, d) => {
        this.value = d[0]
        if (d[1].highValue != null && this.highValue != null) {
          this.highValue = d[1].highValue
        }
        this.onUserChangeEnd({
          value: d[0],
          highValue: this.highValue || undefined,
          pointerType: 1
        }, "aggregate-rect-click")
      })
      .on("mouseover", function (e, d) {
        const { clientX: x, clientY: y } = e

        dispatchEvent(new CustomEvent("provenance-widgets", {
          detail: {
            id: self.id,
            widget: self.highValue != null ? "range-slider" : "slider",
            mode: self.mode,
            interaction: "aggregate-rect-mouseover",
            data: {
              lowValue: d[0],
              ...d[1]
            }
          }
        }))

        d3.select(this).attr("opacity", 0.5)

        tooltip
          .style("opacity", 1)
          .style("display", "block")
          .style("left", `${x + 10}px`)
          .style("top", `${y + 10}px`)
          .select("div")
          .html(
            `Label: ${self.el?.nativeElement?.dataset?.label || self.id} <br />` +
            `Selected ${d[1].highValue == null ? `value: ${d[0]}` : `range: [${d[0]}, ${d[1].highValue}]`} <br />` +
            `# times selected: ${d[1].count} <br />` +
            `Last selected at: ${d[1].date.toLocaleString()} <br />` +
            `${suffixed(d[1].maxIndex!)}/${suffixed(self.data.length - 1)} selection`
          )
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1)
        tooltip
          .style("opacity", 0)
          .style("display", "none")
      })

    let filtered = false

    if (this.filterStart || this.filterEnd) {
      filtered = true
      data = data.reduce<TimeStampedValues[]>((acc, v, i) => {
        if (this.mode === "interaction") {
          if (i >= (this.filterStart as number) && i <= (this.filterEnd as number))
            acc.push({
              ...v,
              actualIndex: i
            })
        } else {
          if (v.timestamp >= (this.filterStart as Date) && v.timestamp <= (this.filterEnd as Date))
            acc.push(v)
        }
        return acc
      }, [])
      y.domain([this.filterStart!, this.filterEnd!])
    }

    const line = d3.line<TimeStampedValues>()
      .x(d => xScale(d.value[index]))
      .y((d, i) => y(this.mode === "interaction" ? filtered ? d.actualIndex ?? i : i : d.timestamp))

    pSvg
      .select("g.body")
      .selectAll(`.line-${index}`)
      .data([data])
      .join("path")
      .transition()
      .duration(250)
      .attr("class", `line-${index}`)
      .attr("fill", "none")
      .attr("stroke", "#495057")
      .attr("stroke-width", 1)
      .attr("d", line)

    const circle = pSvg
      .select("g.body")
      .selectAll(`.circle-${index}`)
      .data(data)
      .join("circle")
      .on("click", (_, d) => {
        this.value = d.value[0]
        if (this.highValue != null) {
          this.highValue = d.value[1]
        }
        this.onUserChangeEnd({
          value: d.value[0],
          highValue: this.highValue || undefined,
          pointerType: 1
        }, "temporal-circle-click")
      })
      .on("mouseover", function (e, d) {
        // const [x, y] = d3.pointer(e)
        const { clientX: x, clientY: y } = e

        dispatchEvent(new CustomEvent("provenance-widgets", {
          detail: {
            id: self.id,
            widget: self.highValue != null ? "range-slider" : "slider",
            mode: self.mode,
            interaction: "temporal-circle-mouseover",
            data: {
              ...d,
              index: d3.select(this).attr("data-index")
            }
          }
        }))

        tooltip
          .style("opacity", 1)
          .style("display", "block")
          .style("left", `${x + 10}px`)
          .style("top", `${y + 10}px`)
          .select("div")
          .html(
            `Label: ${self.el?.nativeElement?.dataset?.label || self.id} <br />` +
            `Selected value: ${d.value[index]} <br />` +
            `Selected at: ${d.timestamp.toLocaleString()} <br />` +
            `${suffixed(+d3.select(this).attr("data-index"))}/${suffixed(self.data.length - 1)} selection <br />`
          )
      })
      .on("mouseout", () => {
        tooltip
          .style("opacity", 0)
          .style("display", "none")
      })

    circle
      .selectChild((d, i) => `.${i}` as any)
      .remove()

    circle
      .transition()
      .duration(250)
      .attr("class", `circle-${index}`)
      .attr("data-index", (_, i) => i)
      .attr("cx", d => xScale(d.value[index]))
      .attr("cy", (d, i) => y(this.mode === "interaction" ? filtered ? d.actualIndex ?? i : i : d.timestamp))
      .attr("r", 4)
      .attr("fill", (d, i) => color(this.mode === "interaction" ? filtered ? d.actualIndex ?? i : i : d.timestamp))
      .attr("stroke", "#495057")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
  }

  _visualize() {
    if (!this.visualize)
      return

    const pSvg = d3.select(this.provenanceSvg.nativeElement)
    const aSvg = d3.select(this.aggregateSvg.nativeElement)

    const sliderNode = d3.select(this.wrapper.nativeElement).select("ngx-slider").node() as any

    // Fix implementation - Get integer width
    const sliderWidth = sliderNode.offsetWidth - 2 * 4

    // get margin-top of node
    if (!this.sliderHeight) {
      this.sliderHeight = parseInt(getComputedStyle(sliderNode).marginTop)
    }

    const pButtonWidth = this.pButton.nativeElement.offsetWidth

    pSvg
      .attr('width', sliderWidth + LINE_CIRCLE_DIAMETER)
      .attr('height', DEFAULT_HEIGHT + LINE_CIRCLE_DIAMETER)
      .style('transform', 'translateX(-1.25rem)')
      .style('width', `calc(${pButtonWidth}px + 1rem + ${sliderWidth + LINE_CIRCLE_DIAMETER}px)`)

    pSvg
      .select("g.body")
      .attr("style", `transform: translate(calc(${pButtonWidth}px + 1rem + ${LINE_CIRCLE_DIAMETER / 2}px),${1 + LINE_CIRCLE_DIAMETER / 2}px)`)

    aSvg
      .attr('width', sliderWidth + LINE_CIRCLE_DIAMETER)
      .attr('height', this.sliderHeight)
      .style("transform", `translateX(calc(1rem + ${pButtonWidth}px))`)

    const x = d3.scaleLinear()
      .domain([this.options.floor!, this.options.ceil!])
      .range([0, parseInt(pSvg.attr('width')) - LINE_CIRCLE_DIAMETER])

    const y = this.mode === "interaction" ?
      d3.scaleLinear()
        .domain([0, this.data.length - 1])
        .range([0, DEFAULT_HEIGHT])
      :
      d3.scaleTime()
        .domain([this.minTime!, this.maxTime!])
        .range([0, DEFAULT_HEIGHT])

    const yAxis = d3.axisLeft(y.nice())

    if (this.mode !== "interaction")
      yAxis.tickValues([this.minTime!, this.maxTime!]).tickFormat((_, i) => i === 0 ? "t=0" : "now")

    const axis = pSvg
      .select(".axis")

    axis
      .select("text")
      .attr("x", -(DEFAULT_HEIGHT + LINE_CIRCLE_DIAMETER) / 2)

    axis
      .style("transform", `translate(calc(${pButtonWidth}px + 1rem + ${LINE_CIRCLE_DIAMETER / 2}px),${1 + LINE_CIRCLE_DIAMETER / 2}px)`)
      .call(yAxis as any)

    this.brush = d3
      .brushY()
      .extent([[-convertRemToPixels(2), 0], [0, DEFAULT_HEIGHT + LINE_CIRCLE_DIAMETER]])
      .on("end", (d) => {

        const selection: number[] = d.selection
        if (selection) {
          this.filterStart = y.invert(selection[0])
          this.filterEnd = y.invert(selection[1])
        } else {
          this.filterStart = undefined
          this.filterEnd = undefined
        }

        dispatchEvent(new CustomEvent("provenance-widgets", {
          detail: {
            id: this.id,
            widget: this.highValue != null ? "range-slider" : "slider",
            mode: this.mode,
            interaction: "brush-end",
            data: {
              selection
            }
          }
        }))

        this.draw(x, y, 0, this.data)
        if (this.highValue != null)
          this.draw(x, y, 1, this.data)
      })

    axis.call(this.brush as any)

    this.draw(x, y, 0, this.data)

    if (this.highValue != null) {
      this.draw(x, y, 1, this.data)
    }

    axis.selectAll("rect").raise()
  }

  onUserChangeEnd(change: ChangeContext, interaction = "user-change-end") {
    this.userChangeEnd.emit(change);
    this.selectedChange?.emit(change)
    const value = change.highValue != null ? [change.value, change.highValue] : [change.value];
    const timestamp = new Date()
    const newEntry = { value, timestamp }

    dispatchEvent(new CustomEvent("provenance-widgets", {
      detail: {
        id: this.id,
        widget: this.highValue != null ? "range-slider" : "slider",
        mode: this.mode,
        interaction,
        data: {
          ...newEntry
        }
      }
    }))

    if (this.freeze)
      return

    const dataEntry = [newEntry]
    if (this.mode === "time")
      dataEntry.push(newEntry)
    this.data = [
      ...this.data,
      ...dataEntry
    ]

    this.addBucket(timestamp, change.value, change.highValue)

    if (!this.minTime)
      this.minTime = timestamp
    this.oldMaxTime = this.maxTime || this.minTime
    this.maxTime = timestamp

    if (this.mode === "time" && isNaN(this.interval)) {
      this.interval = setInterval(() => {
        const newTimeStamp = new Date()
        this.oldMaxTime = this.maxTime
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

    this.provenanceChange?.emit({
      data: this.data,
      minTime: this.minTime,
      oldMaxTime: this.oldMaxTime,
      maxTime: this.maxTime,
      maxFrequency: this.maxFrequency,
      buckets: this.buckets,
      value: this.value,
      highValue: this.highValue
    })
    this._visualize()
  }

  handleProvenanceButtonClick(event: MouseEvent, target: any, op: OverlayPanel) {
    dispatchEvent(new CustomEvent("provenance-widgets", {
      detail: {
        id: this.id,
        widget: this.highValue ? "range-slider" : "slider",
        mode: this.mode,
        interaction: "provenance-button-click",
        initialProvenanceMode: op.overlayVisible ? "temporal" : "aggregate"
      }
    }))
    op.toggle(event, target)
  }
}

