/**

Array1 is a minimal implementation of an 2DArray where
indexing starts with 1 instead of 0.
Indexes (row, column)in a 3x3 matrix is as follows:
|
  [1,1 1,2 1,3]
  [2,1 2,2 2,3]
  [3,1 3,2 3,3]
}
**/

const array1 = (function(){

exports.Array1 = class Array1 {
  constructor(i, j) {
    this.array = new Array(i).fill(0).map((x)=> new Array(j).fill(0));
    this.rows = this.array.length;
    this.cols = this.array[0].length;
    this.transpose = a => a[0].map((_, c) => a.map(r => r[c]));
  };

  /**
  Takes a 'matrix' of semicolon-separeted rows,
  and space separated columns of data 
  in string format "1 0 1; 2 3 1; 0 1 0"
  and returns an Array1.
  **/

  static fromJLMatrix(values, seps=[";"," "]) {
    const a1 = values
      .split(seps[0])
      .map(x=>x.trim().split(seps[1])
      .map(y=>parseFloat(y)));
    const a2 = new Array1(a1.length, a1[0].length);
    a2.array = a1;
    return a2;
  };

  get(i, j) {
    return this.array[i-1][j-1];
  };
  
  set(i, j, value) {
    this.array[i-1][j-1] = value;
  };

  asArrayT() {
    return this.transpose([...this.array]);
  };

  asArray() {
    return this.array;
  }

  toString() {
    return JSON.stringify(this.array);
  };
}

return exports;
})();

if (typeof module.exports === "object") module.exports = array1;
