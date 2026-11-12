## Usage

```js
const { SavgolFilter } = require('js-savgol-filter'); // from Node
const { SavgolFilter } = require('./js-savgol-filter.js'); // from file

const myFilter = SavgolFilter(M,N); // windowsize=M*2+1, degree=N+1
const filteredData = myFilter.filter(data); 

```

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[GitHub](https://www.github.com/gorlang/js-savgol-filter).

git clone https://www.github.com/gorlang/js-savgol-filter

npm install ../dir/to/js-savgol-filter

## Features

Fast and accurate smoothing datasets with Savitzky-Golay filtering algorithm.

[WikiPedia](https://en.wikipedia.org/wiki/Savitzky–Golay_filter)


## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```bash
$ npm install
$ npm test
```

## License

[MIT](LICENSE)