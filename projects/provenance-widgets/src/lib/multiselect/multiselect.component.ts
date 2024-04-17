import { Component, OnDestroy, Input, ElementRef, ChangeDetectorRef, NgZone, Renderer2, OnInit, ViewChild, EventEmitter, Output, AfterViewInit } from '@angular/core';
import { MultiSelect } from 'primeng/multiselect';
import isEqual from 'lodash.isequal'
import { MODE } from '../constants';
import { FilterService, PrimeNGConfig, OverlayService } from 'primeng/api';
import { ProvenanceWidgetsService, Provenance } from '../provenance-widgets.service';

@Component({
  selector: 'provenance-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss', '../slider/slider.component.scss'],
  providers: [ProvenanceWidgetsService]
})
export class MultiselectComponent extends MultiSelect implements OnInit, OnDestroy, AfterViewInit {  
  firstChange = true
  @Input() mode = MODE
  @Input()
  get selected() {
    return this._selected
  }
  set selected(value) {
    if (!this.firstChange && !isEqual(this._selected, value)) {
      this.handleChange(value || [])
    }
    this.firstChange = false
    this._selected = value
  }
  _selected?: typeof this.options

  @Output() selectedChange = new EventEmitter<typeof this.options>()
  @Input() iconSize?: number
  @Input() visualize = true
  @Input() freeze = false
  @ViewChild("pMultiSelect") pMultiSelect!: MultiSelect
  interval = NaN
  optionsRecord: Record<string, typeof this.options[0]> = {}
  myOverlayOptions = { 'appendTo': 'body' as const, ...this.overlayOptions }

  @Input() 
  get provenance() {
    return this._provenance
  }
  set provenance(value) {
    if (this._provenance && value?.revalidate) {
      this._provenance = value
      this.ngOnInit()
      this._visualize()
    }
    this._provenance = value
  }
  _provenance?: Provenance
  @Output() provenanceChange = new EventEmitter<Provenance>()

  constructor(
    private mss: ProvenanceWidgetsService,
    el: ElementRef<any>, renderer: Renderer2, cd: ChangeDetectorRef, zone: NgZone, filterService: FilterService, config: PrimeNGConfig, overlayService: OverlayService
  ) {
    super(el, renderer, cd, zone, filterService, config, overlayService)
    mss.init(
      el,
      ".panel" + this.mss.myId + " > div > ul",
      "multiselect",
    )
    mss.crosshairSelect = (keys: string[]) => {
      this.selectedChange.emit(keys.map((key) => this.optionsRecord[key]))
    }
  }

  getId() {
    return this.mss.myId
  }

  override ngOnInit() {
    super.ngOnInit()
    this.mss.options = this.options.length
    this.mss.mode = this.mode
    this.options.forEach((option) => {
      this.optionsRecord[option[this.dataKey]] = option
    })
    if (this.provenance?.hasUserInteracted || this.provenance?.revalidate) {
      this.mss.setProvenance(this.provenance)
      this.selected = Object
        .entries(this.mss.getProvenance().dataByOption)
        .filter(([_, v]) => {
          const last = v.at(-1)
          return last && last.unselect === undefined && last.select !== undefined
        })
        .map(([k, _]) => this.optionsRecord[k])

      return
    }
    if (this.selected) {
      this.mss.addSimultaneousEvents(
        [],
        this.selected.map(o => o[this.dataKey]),
        this.freeze,
        false
      )
    }
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit()
    this.mss.setElement(this.el)
    if (this.mss.getProvenance()?.hasUserInteracted)
      this._visualize()
  }

  ngOnDestroy() {
    clearInterval(this.interval)
  }

  handleHide(e: any) {
    this.onPanelHide?.emit(e);
    this.overlayVisible = false;
  }

  handleShow(e: any) {
    this.onPanelShow?.emit(e);
    this.overlayVisible = true;
    this._visualize();
  }

  handleChange(value: typeof this.options) {
    this.mss.addSimultaneousEvents(
      this.selected ? this.selected.map(o => o[this.dataKey]) : [],
      value.map(o => o[this.dataKey]),
      this.freeze,
      true,
      new Date(),
      this.provenanceChange,
      this._visualize.bind(this)
    )
  }

  _visualize() {
    if (!this.visualize || !this.overlayVisible)
      return;

    let li: HTMLElement | undefined = undefined
    for (const option of this.options) {
      const div = document.getElementById(this.mss.myId + option[this.dataKey] + 'div')
      if (div && div.parentElement) {
        li = div.parentElement
        break
      }
    }

    if (!li)
      return
    // subtracting padding values
    // TODO: remove magic numbers
    const offsetWidth = li.offsetWidth - 40 - 22 //checkbox width
    const offsetHeight = li.offsetHeight - 24
    this.mss.visualize(this.mode, offsetWidth, offsetHeight)
  }

  getOption(key: string) {
    const events = this.mss.dataByOption[key]?.length
    return events ? `(${events})` : ""
  }

  getProvenance() {
    return this.mss
  }

  handleClick(btn: HTMLButtonElement) {
    this.mss.toggleProvenanceMode(btn, false)
    setTimeout(() => this.pMultiSelect.show(), this.pMultiSelect.overlayVisible ? 1000 : 0)
  }

  handleFilter(event: any) {
    this.onFilter?.emit(event);
    // When the filter is cleared, items are not made available to the DOM immediately, so we need to wait a bit
    // TODO: find a better way to handle this
    const timeout = event.filter ? 0 : 100
    setTimeout(() => this._visualize(), timeout)
  }

}
