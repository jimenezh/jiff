module.exports = async function (n,  plaintext) {
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
    ciphertext = await py`int(Paillier(
        public_key=PaillierPublicKey(${n}, ${n}+1),
        secret_key=None,
        share_secret_key=False).encrypt(
            ${plaintext}
        ).value)`


    end();
    return ciphertext
}