import { Component, inject } from '@angular/core';
import { AppService } from '../app.service';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss']
})
export class CheckboxComponent {
  cities = [
    {
      name: 'New York',
      code: 'New York',
      inputId: 'NY'
    },
    {
      name: 'Rome',
      code: 'Rome',
      inputId: 'RM'
    },
    {
      name: 'London',
      code: 'London',
      inputId: 'LDN'
    },
    {
      name: 'Istanbul',
      code: 'Istanbul',
      inputId: 'IST'
    },
    {
      name: 'Paris',
      code: 'Paris',
      inputId: 'PRS'
    }
  ];
  selected = this.cities.slice(0, 2).map(city => city.code);

  provenance = inject(AppService)

  handleProvenanceChange() {
    this.provenance.checkbox = this.provenance.checkbox ? {
      ...this.provenance.checkbox, 
      selections: this.provenance.checkbox.selections.slice(-2),
      revalidate: true
    } : this.provenance.checkbox
  }
}
