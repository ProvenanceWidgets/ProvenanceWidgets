'use strict';
const {Array1} = require('../jl-array1.js');
const assert = require('assert');


describe('The Array1', function() {

		const array1 = new Array1(4,6);

		const value11 = 11;
		const value46 = 46;

		array1.set(1, 1, value11);
		array1.set(4, 6, value46);

		const values = "1 2;3 4;5 6";
		const array2 = Array1.fromJLMatrix(values);

		it('should have a value 11 at 1,1', function() {
			assert.equal(value11, array1.get(1,1));
		}),

		it('should have a value 46 at 4,6', function() {
			assert.equal(value46, array1.get(4,6));
		}),

		it('creating an array from a csv-sep string and calling asArray() should return', function() {
			const expected = [[1, 2], [3, 4], [5, 6]];
			assert.deepEqual(array2.asArray(), expected);
		}),

		it('calling asArrayT() should return', function() {
			const expected = [[1, 3, 5], [2, 4, 6]];
			assert.deepEqual(array2.asArrayT(), expected);
		})
})