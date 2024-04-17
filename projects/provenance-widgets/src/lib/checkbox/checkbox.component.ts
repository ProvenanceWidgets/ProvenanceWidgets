import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Checkbox } from 'primeng/checkbox';
import { MODE } from '../constants';
import { ProvenanceWidgetsService, Provenance } from '../provenance-widgets.service';
import isEqual from 'lodash.isequal'

@Component({
  selector: 'provenance-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss', '../slider/slider.component.scss'],
  providers: [ProvenanceWidgetsService]
})
export class CheckboxComponent extends Checkbox implements OnInit, AfterViewInit, OnDestroy {
  firstChange = true
  @Input() mode = MODE
  @Input() data!: Record<any, any>[]
  @Input()
  get selected() {
    return this._selected
  }
  set selected(value) {
    if (!this.firstChange && !isEqual(this._selected, value)) {
      this.change(value || [])
    }
    this.firstChange = false
    this._selected = value
  }
  _selected?: string[]
  @Input() visualize = true
  @Input() freeze = false
  @Output() selectedChange = new EventEmitter<string[]>()
  interval = NaN
  @Input() 
  get provenance() {
    return this._provenance
  }
  set provenance(value) {
    if (this._provenance && value?.revalidate) {
      this._provenance = value
      this.ngOnInit()
      this._visualize()
      return
    }
    this._provenance = value
  }
  _provenance?: Provenance
  @Output() provenanceChange = new EventEmitter<Provenance>()

  constructor(
    private mss: ProvenanceWidgetsService,
    private el: ElementRef,
    cd: ChangeDetectorRef,
  ) {
    super(cd)
    mss.init(el, undefined, "checkbox")
    mss.crosshairSelect = (keys: string[]) => {
      this.selectedChange.emit(keys)
    }
  }

  ngOnInit(): void {
    this.mss.options = this.data.length
    this.mss.mode = this.mode
    if (this.provenance?.hasUserInteracted || this.provenance?.revalidate) {
      this.mss.setProvenance(this.provenance)
      this.selected = Object
        .entries(this.mss.getProvenance().dataByOption)
        .filter(([_, v]) => {
          const last = v.at(-1)
          return last && last.unselect === undefined && last.select !== undefined
        })
        .map(([k, _]) => k);

      return
    }
    if (this.selected) {
      this.mss.addSimultaneousEvents(
        [],
        this.selected,
        this.freeze,
        false
      )
    }
  }

  ngAfterViewInit(): void {
    this.mss.setElement(this.el)
    if (this.mss.getProvenance()?.hasUserInteracted)
      this._visualize()
  }

  getId() {
    return this.mss.myId
  }

  ngOnDestroy() {
    clearInterval(this.interval)
  }

  change(e: string[]) {
    this.mss.addSimultaneousEvents(
      this.selected || [],
      e,
      this.freeze,
      true,
      new Date(),
      this.provenanceChange,
      this._visualize.bind(this)
    )
  }

  _visualize() {
    if (!this.visualize)
      return
    // TODO: Remove magic numbers
    const width = this.el.nativeElement.offsetWidth - 22 - 8 // checkbox width + margin
    const height = 22
    this.mss.visualize(this.mode, width, height, "0 0 0 30px")
  }

  getProvenance() {
    return this.mss
  }
}
