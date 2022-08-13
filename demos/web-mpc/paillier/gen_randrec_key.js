const { default: BigNumber } = require("bignumber.js");

module.exports = function (jiff_instance, N, pBI, qBI) {
    const p = BigNumber(pBI.toString());
    const q = BigNumber(qBI.toString());
    
    const phi_N = p.minus(1).times(q.minus(1))

    const result = jiff_instance.helpers.extended_gcd(N, phi_N);

    // Making positive
    const x = jiff_instance.helpers.mod(result[0], phi_N);

    return x
}