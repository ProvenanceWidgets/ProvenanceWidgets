import { Injectable } from '@angular/core';
import { Provenance } from 'projects/provenance-widgets/src';
import { InputTextProvenance } from 'projects/provenance-widgets/src/lib/inputtext/inputtext.component';
import { SliderProvenance } from 'projects/provenance-widgets/src/lib/slider/slider.component';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  slider?: SliderProvenance
  range_slider?: SliderProvenance
  inputtext?: InputTextProvenance
  checkbox?: Provenance
  radiobutton?: Provenance
  multiselect?: Provenance
  dropdown?: Provenance
  freeze = false
  constructor() {}
}
