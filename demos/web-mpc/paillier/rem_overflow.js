const { default: BigNumber } = require("bignumber.js")

module.exports = function (jiff_instance, kappa, k, partyCount, N, phiN, NSquare, c, m, publicKey) {
    phiNSquare = N.times(phiN);
    sumBinary = m.toString(2); // Binary form
    C = []; // Set of 0/1 ciphertexts
    cPrimeBN = c; // Generate c prime
    for (o = k+partyCount; o > k; o--) {
        var b = 0;
        i = sumBinary.length - o - 1;
        if (sumBinary[i] == '1') {
            b = 1
        }
        c01 = publicKey.encrypt(b);
        C.push(c01);
        // removing overflow at 0
        c01BN = BigNumber(c01.toString());
        power2 = BigNumber(2).pow(o); // 2^o
        res = jiff_instance.helpers.pow_mod(c01BN, power2, NSquare); // c_{0/1}^{2^0} mod N^2
        resInv = jiff_instance.helpers.extended_gcd(res, NSquare)[0];
        cPrimeBN = cPrimeBN.times(resInv).mod(NSquare); // c' = c' * res
        resBI = BigInt(resInv.toString(10));

    }

    return { C, cPrimeBN }
}