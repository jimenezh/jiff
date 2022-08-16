const { default: BigNumber } = require("bignumber.js");

module.exports = function (jiff_instance, N, pBI, qBI) {
    const p = BigNumber(pBI.toString());
    const q = BigNumber(qBI.toString());
    
    const phiN = p.minus(1).times(q.minus(1))

    const result = jiff_instance.helpers.extended_gcd(N, phiN);

    // Making positive
    const x = jiff_instance.helpers.mod(result[0], phiN);

    return {phiN, x}
}