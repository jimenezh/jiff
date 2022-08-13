const { default: BigNumber } = require("bignumber.js")

module.exports = function (jiff_instance, N, x, M, C) {
    var d = BigNumber(1).minus(M.times(N)).times(C)
    // Making this positive
    d = jiff_instance.helpers.mod(d, N);
    
    r = jiff_instance.helpers.pow_mod(d, x, N)
    return r
}