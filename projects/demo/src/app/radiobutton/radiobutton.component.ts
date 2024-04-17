import { Component, inject } from '@angular/core';
import { AppService } from '../app.service';

@Component({
  selector: 'app-radiobutton',
  templateUrl: './radiobutton.component.html',
  styleUrls: ['./radiobutton.component.scss']
})
export class RadiobuttonComponent {
  cities = [
    {
      label: 'New York',
      value: 'New York',
      inputId: 'NY_R'
    },
    {
      label: 'Rome',
      value: 'Rome',
      inputId: 'RM_R'
    },
    {
      label: 'London',
      value: 'London',
      inputId: 'LDN_R'
    },
    {
      label: 'Istanbul',
      value: 'Istanbul',
      inputId: 'IST_R'
    },
    {
      label: 'Paris',
      value: 'Paris',
      inputId: 'PRS_R'
    }
  ];
  selected = this.cities[0].value;
  provenance = inject(AppService)
}
