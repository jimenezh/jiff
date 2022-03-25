'use strict';

const python = require('python-bridge');
const py = python({
    python: '/Users/sheilajimenez/Desktop/jiff/bin/python'
}); // It returns value!
const {
  ex, // It does not return value!
  end,
} = py;

const list = [3, 4, 2, 1];

// <python modules>


try {
    ex`import math`;
    // ex`import tno.mpc.encryption_schemes.paillier`;    
    ex`from tno.mpc.encryption_schemes.paillier import PaillierCiphertext`
    // ex`import numpy`;
} catch (e){
    console.log("error is", e)
}

try {
    
    let math = py`math.sqrt(9)`;
    math.then(function (r){console.log(r)});
} catch (e){
    console.log(e)
}

end();
