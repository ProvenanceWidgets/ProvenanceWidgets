'use strict';
const {SavgolFilter} = require('../js-savgol-filter.js');
const assert = require('assert');


function dataset() {
	const data = "0 0 0 3 30 35 28 29 32 13 12 10 11 14 16 12 16 18 18 26 21 23 14 5 3 0 0 1 0 0";
	const data_ = data.split(" ").map(x=>parseInt(x));
	const max = Math.max(...data_);
	return data_.map(x=>x/max);
}

describe('The SavgolFilter', function() {
		
		const filter_2_2 = new SavgolFilter(2,2);

		it('should have an array of coefficients', function() {
			assert.notEqual('undefined', filter_2_2.C);
		}),

		it('coefficients (C) should be 5x1 column vector', function() {
			assert.equal(filter_2_2.C.rows, 5);
			assert.equal(filter_2_2.C.cols, 1);
		}),

		it('coefficients should have values like', function() {
			const expected = [[-0.0857142857142858,0.3428571428571429,0.48571428571428577,0.34285714285714286,-0.08571428571428576]];
			assert.deepEqual(filter_2_2.C.asArrayT(), expected);
		})

		it('expected accumulated ouput value with M=9 and N=7', function() {
			const filter_9_7 = new SavgolFilter(9,7);
			const expected = 11.15966001961425;
			const result = filter_9_7.filter(dataset()).reduce((a,b)=>a+b);
			assert.equal(result, expected);
		})
})