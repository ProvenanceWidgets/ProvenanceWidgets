import { ApplicationRef, DoBootstrap, Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { CheckboxComponent, DropdownComponent, InputtextComponent, MultiselectComponent, ProvenanceWidgetsModule, RadiobuttonComponent, SliderComponent } from 'projects/provenance-widgets/src';
import { createCustomElement } from '@angular/elements';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ProvenanceWidgetsModule
  ],
  providers: [],
  // bootstrap: [AppComponent]
})
export class AppModule implements DoBootstrap {
  constructor(private injector: Injector) {}
  
  ngDoBootstrap(): void {
    const provenanceElements = {
      'web-provenance-slider': SliderComponent,
      'web-provenance-multiselect': MultiselectComponent,
      'web-provenance-dropdown': DropdownComponent,
      'web-provenance-checkbox': CheckboxComponent,
      'web-provenance-radiobutton': RadiobuttonComponent,
      'web-provenance-inputtext': InputtextComponent
    }
    for (const [key, value] of Object.entries(provenanceElements)) {
      customElements.define(key, createCustomElement(value, { injector: this.injector }));
    }
  }
}
