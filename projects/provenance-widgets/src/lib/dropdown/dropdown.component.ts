import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, Output, Renderer2, ViewChild } from '@angular/core';
import { FilterService, PrimeNGConfig } from 'primeng/api';
import { Dropdown } from 'primeng/dropdown';
import { MODE } from '../constants';
import { ProvenanceWidgetsService, Provenance } from '../provenance-widgets.service';
import isEqual from 'lodash.isequal';

interface DropdownChangeEvent<T> {
  originalEvent: Event;
  value: T;
}

@Component({
  selector: 'provenance-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss', '../slider/slider.component.scss'],
  providers: [ProvenanceWidgetsService]
})
export class DropdownComponent extends Dropdown implements AfterViewInit {
  firstChange = true
  @Input() mode = MODE
  @Input()
  get selected() {
    return this._selected
  }
  set selected(value) {
    if (!this.firstChange && !isEqual(this._selected, value)) {
      this.handleChange({ originalEvent: new Event("provenance"), value })
    }
    this.firstChange = false
    this._selected = value
  }
  _selected?: typeof this.options[0]
  @Input() iconSize?: number
  @Input() visualize = true
  @Output() selectedChange = new EventEmitter<typeof this.options[0]>()
  @ViewChild("pDropdown") pDropdown!: Dropdown
  interval = NaN
  optionsRecord: Record<string, typeof this.options[0]> = {}
  myOverlayOptions = {
    'appendTo': 'body' as const,
    hideOnEscape: false, 
    ...this.overlayOptions
  }
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
  @Input() freeze = false
  @Output() provenanceChange = new EventEmitter<Provenance>()

  constructor(
    private mss: ProvenanceWidgetsService,
    el: ElementRef<any>,
    renderer: Renderer2,
    cd: ChangeDetectorRef,
    zone: NgZone,
    filterService: FilterService,
    config: PrimeNGConfig
  ) {
    super(el, renderer, cd, zone, filterService, config)
    mss.init(
      el,
      ".panel" + this.mss.myId + " > div > ul",
      "select"
    )
    mss.crosshairSelect = (keys: string[]) => {
      this.selectedChange.emit(this.optionsRecord[keys[0]])
    }
  }

  override ngOnInit(): void {
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
        .map(([k, _]) => this.optionsRecord[k])[0]

        return
    }
    if (this.selected) {
      this.mss.addSimultaneousEvents(
        [],
        [this.selected[this.dataKey]],
        this.freeze,
        false
      )
    }
  }

  override ngAfterViewInit(): void {
    this.mss.setElement(this.el)
    super.ngAfterViewInit()
    if (this.mss.getProvenance()?.hasUserInteracted)
      this._visualize()
  }

  getProvenance() {
    return this.mss
  }

  getId() {
    return this.mss.myId
  }

  handleClick(btn: HTMLButtonElement) {
    this.mss.toggleProvenanceMode(btn, false)
    setTimeout(() => this.pDropdown.show(), this.pDropdown.overlayVisible ? 1000 : 0)
  }

  handleChange(e: DropdownChangeEvent<typeof this.selected>) {
    this.mss.addSimultaneousEvents(
      this.selected ? [this.selected[this.dataKey]] : [],
      e.value ? [e.value[this.dataKey]] : [],
      this.freeze,
      true,
      new Date(),
      this.provenanceChange,
      this._visualize.bind(this)
    )
  }

  handleFilter(event: any) {
    this.onFilter?.emit(event)
    const timeout = event.filter ? 0 : 100
    setTimeout(() => this._visualize(), timeout)
  }

  toggleShow(e: any) {
    this[this.overlayVisible ? 'onHide' : 'onShow']?.emit(e)
    this.overlayVisible = !this.overlayVisible
    this._visualize()
  }

  _visualize() {
    if (!this.visualize || !this.overlayVisible)
      return

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

    const offsetWidth = li.offsetWidth - 40
    const offsetHeight = li.offsetHeight - 24
    this.mss.visualize(this.mode, offsetWidth, offsetHeight)
  }
}
