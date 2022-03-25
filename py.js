'use strict';

const python = require('python-bridge');
const py = python({
    python: '/Users/sheilajimenez/Desktop/jiff/bin/python'
}); // It returns value!
const {
  ex, // It does not return value!
  end,
} = py;
// console.log(py)

const list = [3, 4, 2, 1];

// <python modules>

ex`import math`;
ex`import os`
// ex`print(os.environ)`
// ex`import pyautogui`;
ex`import numpy as np`;
// ex`import pandas`;
end();