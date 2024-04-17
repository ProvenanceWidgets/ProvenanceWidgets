import { Component, inject } from '@angular/core';
import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  show = true;
  provenance = inject(AppService);

  handleSimulateReload() {
    this.show = false;

    this.provenance.slider = this.provenance.slider ? {
      data: this.provenance.slider.data,
      revalidate: true
    } : this.provenance.slider;

    this.provenance.range_slider = this.provenance.range_slider ? {
      ...this.provenance.range_slider,
      revalidate: true
    } : this.provenance.range_slider;

    this.provenance.dropdown = this.provenance.dropdown ? {
      ...this.provenance.dropdown,
      revalidate: true
    } : this.provenance.dropdown;

    this.provenance.multiselect = this.provenance.multiselect ? {
      ...this.provenance.multiselect,
      revalidate: true
    } : this.provenance.multiselect;

    this.provenance.checkbox = this.provenance.checkbox ? {
      ...this.provenance.checkbox,
      revalidate: true
    } : this.provenance.checkbox;

    this.provenance.radiobutton = this.provenance.radiobutton ? {
      ...this.provenance.radiobutton,
      revalidate: true
    } : this.provenance.radiobutton;

    this.provenance.inputtext = this.provenance.inputtext ? {
      data: this.provenance.inputtext.data,
      revalidate: true
    } : this.provenance.inputtext;

    setTimeout(() => {
      this.show = true;
    }, 500);
  }

  handleFreeze() {
    this.provenance.freeze = !this.provenance.freeze;
  }
}
