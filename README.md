# Provenance Widgets
A library of GUI widgets such as range sliders and dropdowns to track and dynamically overlay analytic provenance.

### Read our paper, to appear in 2024 IEEE VIS Conference
```bibTeX
@article{narechania2024provenancewidgets,
  title = {{ProvenanceWidgets}: {A Library of UI Control Elements to Track and Dynamically Overlay Analytic Provenance}},
  shorttitle = {{ProvenanceWidgets}},
  author = {{Narechania}, Arpit and {Odak}, Kaustubh and {El-Assady}, Mennatallah and {Endert}, Alex},
  journal = {IEEE Transactions on Visualization and Computer Graphics (TVCG)},
  doi = {10.48550/arXiv.2407.17431},
  url = {https://doi.org/10.48550/arXiv.2407.17431},
  year = {2024},
  publisher = {IEEE}
}
```

## Quickstart

For the best developer experience, use the [Provenance Widgets Starter Code](https://github.com/kausko/provenance-widgets-starter). It is a minimal Angular application that demonstrates how to use the Provenance Widgets library. If you wish to use it in an existing Angular application, please ensure your versions of the Angular and PrimeNG libraries are compatible with the Provenance Widgets library.

*If you are using the starter code, you can skip the installation and configuration steps and jump straight to the [Usage](#Usage) section.*

## Installation

The library can be installed from npm using

```sh
npm i provenance-widgets
```

## Configuration
The library builds up on PrimeNG's components. Hence, it relies on PrimeNG, PrimeFlex and PrimeIcons for styling. For best results, add the following to your projects's `angular.json` file.

```json
{
    "projects": {
        "<your-project>": {
            "architect": {
                "build": {
                    "options": {
                        // Add the following:

                        // Used by Provenance Widgets for deep object comparisons
                        "allowedCommonJsDependencies": [
                            // Your allowedCommonJsDependencies here
                            "lodash.isequal"
                        ],

                        // Provenance Widgets builds up on PrimeNG's components. Hence, it relies on PrimeNG, PrimeFlex and PrimeIcons for styling.
                        "styles": [
                            // Your styles here
                            "node_modules/primeicons/primeicons.css",
                            "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
                            "node_modules/primeng/resources/primeng.min.css",
                            "node_modules/primeflex/primeflex.css"
                            ]
                    }
                }
            }
        }        
    }
}
```

Then, add the following to your projects's `app.module.ts` file.

```typescript
import { ProvenanceWidgetsModule } from 'provenance-widgets';

@NgModule({
  declarations: [
    // Your declarations here
  ],
  imports: [
    // Your imports here
    ProvenanceWidgetsModule
  ],
  providers: [
    // Your providers here
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## Usage

All widgets extend an existing component's class. Hence, all original properties/attributes and methods of the component are available to the widget. For example, the `Slider` widget extends [ngx-slider's `SliderComponent`](https://angular-slider.github.io/ngx-slider/) class. Hence, bindings such as `value` and `highValue` are available to the `Slider` widget.

### Common Properties
All widgets have the following common properties:

- `provenance`: The provenance of interactions recorded by the widget. Use this property to persist-restore or modify-reconstruct the provenance. Each widget has a different provenance type, which is described in the widget's documentation.
    - Default: `undefined`
    - Binding: `[(provenance)]` (Two-way binding)
        - Syntactic sugar for `[provenance]` and `(provenanceChange)`
    - Widget updates when the property is changed?: Yes

- `visualize`: Whether to visualize the provenance.
    - Default: `true`
    - Binding: `[visualize]`
    - Widget updates when the property is changed?: No (Only applied at initialization. The widget must be unmounted and remounted to apply changes.)
- `freeze`: Whether to freeze the provenance. If `true`, the widget will not record any provenance and existing visualizations will be frozen (i.e., interactions will not update the visualizations.)
    - Default: `false`
    - Binding: `[freeze]`
    - Widget updates when the property is changed?: No (Only applied at initialization. The widget must be unmounted and remounted to apply changes.)

#### Slider
- Extends: [`SliderComponent`](https://angular-slider.github.io/ngx-slider/docs)
- Selector: `<provenance-slider>`
- Provenance type: [`SliderProvenance`](https://github.com/arpitnarechania/provenance-app/blob/5bc6575571186890d13b88d9706f1c7c6d463195/widgets/projects/provenance-widgets/src/lib/slider/slider.component.ts#L21). Important properties:
    - data: An array of time-stamped values.
    - revalidate: Whether to revalidate the provenance. If `true`, the widget will recompute the provenance from the `data` property.
- Custom Properties:
    - `selectedChange`: Emits a [`ChangeContext`](https://github.com/angular-slider/ngx-slider/blob/67c1c7fc245a2c02fd5a3af08bd1995b7902451d/src/ngx-slider/lib/change-context.ts#L3) when the `onUserChangeEnd` event is fired.
- Note: The widget does not update when the `value` or `highValue` properties are changed. Use the `provenance` property for this purpose instead.

#### InputText
- Extends: [`AutoComplete`](https://www.primefaces.org/primeng-v15-lts/autocomplete)
- Selector: `<provenance-inputtext>`
- Provenance type: [`InputTextProvenance`](https://github.com/arpitnarechania/provenance-app/blob/5bc6575571186890d13b88d9706f1c7c6d463195/widgets/projects/provenance-widgets/src/lib/inputtext/inputtext.component.ts#L24). Important properties:
    - data: An array of time-stamped values.
    - revalidate: Whether to revalidate the provenance. If `true`, the widget will recompute the provenance from the `data` property.
- Custom Properties:
    - `value`: The value of the input field.
        - Default: `undefined`
        - Binding: `[(value)]` (Two-way binding)
            - Syntactic sugar for `[value]` and `(valueChange)`
        - Widget updates when the property is changed?: Yes

### Selection-type Widgets

This subset of widgets allows the user to 'select' either a single item or multiple items from a list. They share the following common properties:

- `selected`: The selected item(s) from the list.
    - **Required: Yes**
    - Default: `undefined`
    - Binding: `[(selected)]` (Two-way binding)
        - Syntactic sugar for `[selected]` and `(selectedChange)`
    - Widget updates when the property is changed?: Yes

- Provenance type: [`Provenance`](https://github.com/arpitnarechania/provenance-app/blob/5bc6575571186890d13b88d9706f1c7c6d463195/widgets/projects/provenance-widgets/src/lib/provenance-widgets.service.ts#L22). Important properties:
    - selections: An array of time-stamped values.
    - revalidate: Whether to revalidate the provenance. If `true`, the widget will recompute the provenance from the `selections` property.


#### MultiSelect

- Extends: [`MultiSelect`](https://www.primefaces.org/primeng-v15-lts/multiselect)
- Selector: `<provenance-multiselect>`
- Custom properties:
    - Type of `selected`: `typeof options`, where options is the array of options to display in the multiselect. See the [MultiSelect API](https://www.primefaces.org/primeng-v15-lts/multiselect#api.properties) for more information about the `options` property.
    - Note: The `label` (value to show) and `value` (unique identifier) properties *MUST* be identified by the `optionLabel` and `dataKey` properties, respectively. Example is available in the starter code.

#### Dropdown

- Extends: [`Dropdown`](https://www.primefaces.org/primeng-v15-lts/dropdown)
- Selector: `<provenance-dropdown>`
- Custom properties/behaviors: Same as `MultiSelect`, except that the `selected` property is of type `typeof options[i]`. See the [Dropdown API](https://www.primefaces.org/primeng-v15-lts/dropdown#api.properties) for more information about the `options` property.


#### Checkbox

- Extends: [`Checkbox`](https://www.primefaces.org/primeng-v15-lts/checkbox)
- Selector: `<provenance-checkbox>`
- Custom Properties:
    - `data`: List of items to select from.
        - Default: `undefined`
        - Binding: `[data]`
        - Type: `Record<keyof CheckboxProperties, any>[]`, where CheckboxProperties can include properties of the [Checkbox API](https://www.primefaces.org/primeng-v15-lts/checkbox#api.properties).
            - NOTE: The `label` and `value` properties can be aliased by providing them as `input`s to the widget. For example, if the `label` property is aliased as `name`, the `data` property should include an array of objects with a `name` property. Example is available in the starter code.
        - Widget updates when the property is changed?: No
    - Type of `selected`: `string[]`, where each string is the value (unique identifier, default is `value` unless aliased) of the selected item.

#### RadioButton

- Extends: [`RadioButton`](https://www.primefaces.org/primeng-v15-lts/radiobutton)
- Selector: `<provenance-radiobutton>`
- Custom Properties/behaviors: Same as `Checkbox`, except that the `selected` property is of type `string`.


## Contact
If you have any questions, feel free to [open an issue](https://github.com/ProvenanceWidgets/ProvenanceWidgets/issues/new/choose) or contact [Arpit Narechania](http://narechania.com).
