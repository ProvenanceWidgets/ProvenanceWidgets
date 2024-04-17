import { OnInit, EventEmitter, AfterViewInit } from '@angular/core';
import { Output } from '@angular/core';
import { Component, ElementRef, Input, OnDestroy } from '@angular/core';
import { MODE } from '../constants';
import { ProvenanceWidgetsService, Provenance } from '../provenance-widgets.service';
import isEqual from 'lodash.isequal';

interface RadioButtonClickEvent {
  /**
   * Browser event.
   */
  originalEvent: Event;
  /**
   * Browser event.
   */
  value: any;
}

@Component({
  selector: 'provenance-radiobutton',
  templateUrl: './radiobutton.component.html',
  styleUrls: ['./radiobutton.component.scss', '../slider/slider.component.scss'],
  providers: [ProvenanceWidgetsService]
})
export class RadiobuttonComponent implements OnDestroy, OnInit, AfterViewInit {
  /**
   * Value of the radiobutton.
   * @group Props
   */
  @Input() value: any;
  /**
   * The name of the form control.
   * @group Props
   */
  @Input() formControlName: string | undefined;
  /**
   * Name of the radiobutton group.
   * @group Props
   */
  @Input() name: string | undefined;
  /**
   * When present, it specifies that the element should be disabled.
   * @group Props
   */
  @Input() disabled: boolean | undefined;
  /**
   * Label of the radiobutton.
   * @group Props
   */
  @Input() label: string | undefined;
  /**
   * Index of the element in tabbing order.
   * @group Props
   */
  @Input() tabindex: number | undefined;
  /**
   * Identifier of the focus input to match a label defined for the component.
   * @group Props
   */
  @Input() inputId: string | undefined;
  /**
   * Establishes relationships between the component and label(s) where its value should be one or more element IDs.
   * @group Props
   */
  @Input() ariaLabelledBy: string | undefined;
  /**
   * Used to define a string that labels the input element.
   * @group Props
   */
  @Input() ariaLabel: string | undefined;
  /**
   * Inline style of the component.
   * @group Props
   */
  @Input() style: { [klass: string]: any } | null | undefined;
  /**
   * Style class of the component.
   * @group Props
   */
  @Input() styleClass: string | undefined;
  /**
   * Style class of the label.
   * @group Props
   */
  @Input() labelStyleClass: string | undefined;
  /**
   * Callback to invoke on radio button click.
   * @param {RadioButtonClickEvent} event - Custom click event.
   * @group Emits
   */
  @Output() onClick: EventEmitter<RadioButtonClickEvent> = new EventEmitter<RadioButtonClickEvent>();
  /**
   * Callback to invoke when the receives focus.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  @Output() onFocus: EventEmitter<Event> = new EventEmitter<Event>();
  /**
   * Callback to invoke when the loses focus.
   * @param {Event} event - Browser event.
   * @group Emits
   */
  @Output() onBlur: EventEmitter<Event> = new EventEmitter<Event>();
  firstChange = true;
  @Input() mode = MODE
  @Input() data!: Record<any, any>[]
  // @Input() selected?: string
  @Input()
  get selected() {
    return this._selected
  }
  set selected(value: string | undefined) {
    if (!this.firstChange && !isEqual(this._selected, value)) {
      this.change(value)
    }
    this.firstChange = false
    this._selected = value
  }
  _selected?: string

  @Input() visualize = true
  @Input() freeze = false
  @Output() selectedChange = new EventEmitter<string>()
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
    }
    this._provenance = value
  }
  _provenance?: Provenance
  @Output() provenanceChange = new EventEmitter<Provenance>()

  constructor(
    private mss: ProvenanceWidgetsService,
    private el: ElementRef
  ) {
    mss.init(el, undefined, "radio")
    mss.crosshairSelect = (keys: string[]) => {
      this.selectedChange.emit(keys[0])
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
        .map(([k, _]) => k)[0];
      return
    }
    if (this.selected){
      this.mss.addSimultaneousEvents(
        [],
        [this.selected],
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

  change(e: any) {
    this.mss.addSimultaneousEvents(
      this.selected ? [this.selected] : [],
      e ? [e] : [],
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
    const width = this.el.nativeElement.offsetWidth - 22 - 8 // radiobutton width + margin
    const height = 22
    this.mss.visualize(this.mode, width, height, "0 0 0 30px")
  }

  getProvenance() {
    return this.mss
  }
}
