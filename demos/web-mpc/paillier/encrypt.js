module.exports = async function (n,  plaintext) {
    const BigNumber = require('bignumber.js');

    // spawning python interpreter
    const python = require('python-bridge');
    const py = python({
        python: '/Users/sheilajimenez/Desktop/jiff/bin/python'
    });
    
    // ex used for when nothing needs to be returned
    // py used for when a return value is needed
    // end terminates the python interpreter
    const {
        ex,
        end,
      } = py;

    ex`from tno.mpc.encryption_schemes.paillier import PaillierCiphertext, Paillier, PaillierPublicKey`
    // Create paillier encryption scheme and then encrypt plaintext
    console.log(n, plaintext)
    ciphertext = await py`str(Paillier(
        public_key=PaillierPublicKey(int(${n.toPrecision()}), int(${n.toPrecision()})+1),
        secret_key=None,
        share_secret_key=False).encrypt(
            int(${plaintext.toPrecision()})
        ).value)`


    end();
    console.log('ciphertext os ', ciphertext)
    return BigNumber(ciphertext)
}