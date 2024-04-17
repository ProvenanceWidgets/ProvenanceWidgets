import { DoBootstrap, Injector, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createCustomElement } from '@angular/elements';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { IconComponent } from './icon/icon.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { RadiobuttonComponent } from './radiobutton/radiobutton.component';
import { MultiselectComponent } from './multiselect/multiselect.component';
import { InputtextComponent } from './inputtext/inputtext.component';
import { DropdownComponent } from './dropdown/dropdown.component';
import { SliderComponent } from './slider/slider.component';
import { ProvenanceWidgetsComponent } from './provenance-widgets.component';

import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';

@NgModule({
  declarations: [
    ProvenanceWidgetsComponent,
    SliderComponent,
    IconComponent,
    CheckboxComponent,
    RadiobuttonComponent,
    MultiselectComponent,
    InputtextComponent,
    DropdownComponent,
  ],
  imports: [
    CommonModule,
    NgxSliderModule,
    OverlayPanelModule,
    ButtonModule,
    TooltipModule,
    FormsModule,
    BrowserAnimationsModule,
    CheckboxModule,
    RadioButtonModule,
    MultiSelectModule,
    DropdownModule,
    InputTextModule,
    AutoCompleteModule
  ],
  exports: [
    ProvenanceWidgetsComponent,
    SliderComponent,
    CheckboxComponent,
    RadiobuttonComponent,
    MultiselectComponent,
    InputtextComponent,
    DropdownComponent
  ]
})
export class ProvenanceWidgetsModule {}
