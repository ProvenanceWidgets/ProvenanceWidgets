import { AfterViewInit, Component } from '@angular/core';
import { MODE } from 'projects/provenance-widgets/src/lib/constants';
import { View } from 'vega';
import embed from 'vega-embed';
import spec from './voyager.vg.json'

@Component({
  selector: 'app-voyager',
  templateUrl: './voyager.component.html',
  styleUrls: ['./voyager.component.scss']
})
export class VoyagerComponent implements AfterViewInit{
  view?: View
  voyager_spec = spec
  data = [
    {
      label: "Men",
      value: "men"
    },
    {
      label: "Women",
      value: "women"
    },
    {
      label: "All",
      value: "all"
    }
  ]

  selected = 'all'
  mode = MODE

  change(e: string) {
    console.log(e)
    this.view?.signal("sex", e).runAsync()
  }

  ngAfterViewInit(): void {
    this.voyager_spec = spec
    embed("#voyager-embed", this.voyager_spec as any, { renderer: "svg" })
    .then(res => {
      this.view = res.view
      this.view.signal("sex", this.selected).runAsync()
    })
  }

  sliderChange(change: any) {
    // this
    //   .view
    //   ?.signal("customExtent", [change.value, change.highValue])
    //   .runAsync()
    this.voyager_spec = {
      ...this.voyager_spec,
      "signals": [
        {
          "name": "customExtent", "value": [change.value, change.highValue]
        },
        {
          "name": "sex", "value": this.view?.signal("sex")
        },
        {
          "name": "query", "value": this.view?.signal("query"),
          "on": [
            {"events": "area:click!", "update": "datum.job"},
            {"events": "dblclick!", "update": "''"}
          ],
          "bind": {
            "element": "#voyager-text-input input",
            "event": "blur"
          }
        }
      ]
    }

    embed("#voyager-embed", this.voyager_spec as any, { renderer: "svg" })
    .then(res => {
      this.view = res.view
    })
  }
}
