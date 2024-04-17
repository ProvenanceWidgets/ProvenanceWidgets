import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AGGREGATE_SVG_BASE64, DISABLED_SVG_BASE64, TEMPORAL_SVG_BASE64 } from '../constants';

@Component({
  selector: 'provenance-icon',
  templateUrl: './icon.component.html',
  styles: [`
    ::ng-deep {
      .provenance-icon-tooltip {
        width: max-content !important;
        max-width: 335px !important;
      }
    }
  `]
})
export class IconComponent implements OnChanges {
  AGGREGATE_B64 = AGGREGATE_SVG_BASE64
  TEMPORAL_B64 = TEMPORAL_SVG_BASE64
  DISABLED_B64 = DISABLED_SVG_BASE64
  @Input() icon!: 'aggregate' | 'temporal' | 'disabled';
  @Input() size?: number;
  tooltipText = ''

  ngOnChanges(changes: SimpleChanges) {    
    if (changes["icon"].currentValue) {
      const icon = changes["icon"].currentValue
      this.tooltipText = '<small>'
      if (icon === 'aggregate') {
        this.tooltipText += `<strong>Aggregate mode</strong><br/>Showing overall frequency (larger size = more) and recency (darker color = more) of past interactions.<br />Click to toggle.`
      } else if (icon === 'temporal') {
        this.tooltipText += `<strong>Temporal mode</strong><br/>Showing individual past interactions over the selected time period.<br />Click to toggle.`
      } else if (icon === 'disabled') {
        this.tooltipText += `<strong>No provenance yet.</strong><br/>Interact with the widget to generate/see provenance.`
      }
      this.tooltipText += '</small>'
    }
  }
}
