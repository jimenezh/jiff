module.exports = async function (private_key,  raw_ciphertext) {
  
// Requirements for using python TNO paillier package
const assert = require('assert');
const python = require('python-bridge');
const py = python({
    python: '/Users/sheilajimenez/Desktop/jiff/bin/python'
});
const {
    ex,
    end,
  } = py;

ex`from math import factorial`
ex`from tno.mpc.protocols.distributed_keygen.paillier_shared_key import PaillierSharedKey`
ex`from tno.mpc.encryption_schemes.paillier import PaillierCiphertext, Paillier, PaillierPublicKey`

// Constants needed for private key
const delta = await py`factorial(${private_key.party_count})`
const theta = await py`4*(${delta}**2)`

const n = BigInt(private_key.n).toString()
const rand_exp = BigInt(private_key.rand_exp).toString()

// Create a Paillier private key to use private key methods
// For this, we need a paillier public key to encrypt the raw input ciphertext
// Use partial decrypt method
// Since python-bridge only allows return of ints, we do this all in one step
const partial_decryption =  await py`int(PaillierSharedKey (
  int(${n}), 
  ${private_key.threshold} , 
  ${private_key.id}, 
  ${private_key.s}, 
  ${delta}, 
  ${theta}, 
  int(${rand_exp})).partial_decrypt(
    PaillierCiphertext(
      ${raw_ciphertext},
      Paillier(
        public_key=PaillierPublicKey(int(${n}), int(${n})+1),
        secret_key=None,
        share_secret_key=False
      )
    )  
  ))`

end();


return parseInt(partial_decryption)
}
