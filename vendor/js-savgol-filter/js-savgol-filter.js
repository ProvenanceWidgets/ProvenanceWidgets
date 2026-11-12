'use strict';
const {Array1} = require('../jl-array1/jl-array1.js');
const {Matrix, QrDecomposition} = require('ml-matrix');

/**
Savitzky-Golay-filter
**/

const SavgolFilter = (function(){

function eiColVec(n, i=0) {
	const ei = new Array(n).fill(0);
	ei[i] = 1;
	return Matrix.columnVector(ei);
}

function Jacobian(M,N) {
	const J = new Array1(2*M+1, N+1);
	for (var i = 1; i <= 2*M+1; i++) {
		for(var j = 1; j <= N+1; j++) {
			J.set(i, j, Math.pow(i-M-1, j-1));
		}
	}
	return J;
}

function validateParams(M,N) {

	if (!Number.isInteger(N)
		|| !Number.isInteger(M)
		|| M < 1 
		|| N < 0) {
		throw "Error: M and N must be valid integers where M > 0 and N >= 0.";
	}

	const winsize = M*2+1;
	const degrees = N+1;

	if (degrees >= winsize) {
		throw "Error: Window size: #window (2*M+1) must be larger than degree: #degree (N+1))"
			.replace("#window", winsize)
			.replace("#degree", degrees);
	}
	return {winsize: winsize, degrees: degrees};
}

function Coefficients(M, N) {

	const params = validateParams(M,N);
	const A = new Matrix(Jacobian(M, N).asArray());
	const QR = new QrDecomposition(A);
 	const x = Array(params.winsize).fill(0);

 	x.forEach((item, i) => {
		x[i] = QR.solve(eiColVec(params.winsize, i)).get(0,0);
	});
	return Array1.fromJLMatrix(x.join(";"));	
}

function pad(filtered, D, M) {

    D.slice(0, M+1).forEach((item, i) => {
    filtered[i] = D[i];
    	if (i < M) {
    		filtered[filtered.length - i - 1] = D[D.length - i - 1];
    	}
    });
    return filtered;
}

function applyFilter(D=null, C=null, M=1, N=1) {
  	const n = D.length;
    const filtered = new Array(n).fill(0);
    filtered.forEach((item, i) => {
        for (var j = 1; j <= M; j++) {
            if (i - j >= 1) {
                filtered[i] += (C.get(M+1-j, 1) * D[i-j]);
            };
            if (i + j < n) {
                filtered[i] += (C.get(M+1+j, 1) * D[i+j]);
            };  
        }
        filtered[i] += C.get(M+1, 1) * D[i];
    });
    return pad(filtered, D, M);
}


exports.SavgolFilter = class SavgolFilter {

  	constructor(M=2,N=2) {
  		this.M = M;
		this.N = N;
		this.C = Coefficients(M,N);
  		return this;
  	};

  	filter(D) {
  		return applyFilter(D, this.C, this.M, this.N);
  	}

  	filterWith(D, M=2, N=2) {
  		return applyFilter(D, Coefficients(M, N), M, N);
  	}

  	filterWithCoef(D, C=null, M=2, N=2) {
  		return applyFilter(D, C, M, N);
  	};

  	coefficients(M, N) {
  		return Coefficients(M, N);
  	}

	toString() {
		return "{SavgolFilter{Winsize=#win, Degrees=#deg, (M=#M, N=#N), C=#C}"
			.replace("#win", this.M*2+1)
			.replace("#deg", this.N+1)
			.replace("#M", this.M)
			.replace("#N", this.N)
			.replace("#C", JSON.stringify(this.C))
			;
	};
}

return exports;
})();

if (typeof module.exports === "object") module.exports = SavgolFilter;



