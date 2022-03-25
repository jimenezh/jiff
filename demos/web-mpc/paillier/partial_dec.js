module.exports = async function (private_key,  raw_ciphertext) {
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

ex`from math import factorial`
ex`from tno.mpc.protocols.distributed_keygen.paillier_shared_key import PaillierSharedKey`
ex`from tno.mpc.encryption_schemes.paillier import PaillierCiphertext, Paillier, PaillierPublicKey`

const delta = await py`factorial(${private_key.party_count})`
const extra_factor = await py`4*(${delta}**2)`

console.log(private_key, 'delta', delta, 'extra', extra_factor)


const partial_decryption =  await py`PaillierSharedKey (
  ${private_key.n}, 
  ${private_key.threshold} , 
  ${private_key.id}, 
  ${private_key.s}, 
  ${delta}, 
  ${extra_factor}, 
  ${private_key.rand_exp}).partial_decrypt(
    PaillierCiphertext(
      ${raw_ciphertext},
      Paillier(
        public_key=PaillierPublicKey(${private_key.n}, ${private_key.n}+1),
        secret_key=None,
        share_secret_key=False
      )
    )  
  ).digits()`
// console.log("python private key is", python_private_key)

end();

return parseInt(partial_decryption)


}
