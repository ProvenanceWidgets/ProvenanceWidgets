import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { AppComponent } from './app.component';
import { ProvenanceWidgetsModule } from 'projects/provenance-widgets/src';
import { SliderComponent } from './slider/slider.component';
import { MultiSelectComponent } from './multiselect/multiselect.component';
import { ToolbarModule } from 'primeng/toolbar';
import { RadiobuttonComponent } from './radiobutton/radiobutton.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { InputnumberComponent } from './inputnumber/inputnumber.component';
import { InputtextComponent } from './inputtext/inputtext.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { VoyagerComponent } from './voyager/voyager.component';
import { DropdownComponent } from './dropdown/dropdown.component';
import { AppService } from './app.service';
@NgModule({
  declarations: [
    AppComponent,
    SliderComponent,
    MultiSelectComponent,
    RadiobuttonComponent,
    CheckboxComponent,
    InputnumberComponent,
    InputtextComponent,
    VoyagerComponent,
    DropdownComponent
  ],
  imports: [
    BrowserModule,
    ButtonModule,
    ProvenanceWidgetsModule,
    ToolbarModule,
    TagModule,
    // TO REMOVE:
    InputNumberModule,
    InputTextModule,
  ],
  providers: [
    { provide: AppService }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
