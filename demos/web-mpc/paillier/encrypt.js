module.exports = async function (n,  plaintext) {
    // Requirements for using python TNO paillier package
    const assert = require('assert');
    const python = require('python-bridge');
    const py = python({
        python: '/Users/sheilajimenez/Desktop/jiff/bin/python'
    });
    
    const {
        ex, // It does not return value!
        end,
      } = py;

    console.log(n, typeof(n), plaintext, typeof(plaintext))

    ex`from tno.mpc.encryption_schemes.paillier import PaillierCiphertext, Paillier, PaillierPublicKey`

    ciphertext = await py`int(Paillier(
        public_key=PaillierPublicKey(${n}, ${n}+1),
        secret_key=None,
        share_secret_key=False).encrypt(
            ${plaintext}
        ).value)`


    end();
    return ciphertext
}