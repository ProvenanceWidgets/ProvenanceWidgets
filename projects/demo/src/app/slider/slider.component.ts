import { Component, inject } from '@angular/core';
import { AppService } from '../app.service';

@Component({
  selector: 'app-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent {
  title = 'demo';
  value: number = 0;
  highValue: number = 250;
  provenance = inject(AppService)

  handleProvenanceChange() {
    this.provenance.slider = this.provenance.slider ? { 
      data: this.provenance.slider.data.slice(-2),
      revalidate: true
    } : this.provenance.slider
  }
}
