## Usage

```js
const { Array1 } = require('jl-array1'); // from Node

const { Array1 } = require('./jl-array1.js'); // from file

const array1 = new Array1(4, 5); // Create an 4x5 array filled with zeros

const array2 = Array1.fromJLMatrix("1 2 3; 3 4 5; 6 7 8"); // create 3x3 array with values

```

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[GitHub](https://www.github.com/gorlang/jl-array1).

git clone https://www.github.com/gorlang/jl-array1

npm install ../dir/to/jl-array1

## Features

Array1 is a minimal implementation of an numerical 2DArray where
row/column indexing starts with 1 instead of 0.

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```bash
$ npm install
$ npm test
```

## License

[MIT](LICENSE)