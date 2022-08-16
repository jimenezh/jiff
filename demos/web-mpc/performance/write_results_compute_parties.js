module.exports = function (numInputParties, keyGenPerf, compPerf) {
    const fs = require('fs');
    fs.appendFile(`performance/${numInputParties}_comp.log`, compPerf + "\n", err => {
        if (err) {
            console.error(err);
        }
        // done!
    });

    fs.appendFile(`performance/${numInputParties}_keyGen.log`, keyGenPerf + "\n", err => {
        if (err) {
            console.error(err);
        }
        // done!
    });
}