module.exports = async function (private_key,  partial_dict) {
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
    
    // Constants needed for paillier private key
    const delta = await py`factorial(${private_key.party_count})`
    const extra_factor = await py`4*(${delta}**2)`
    
    // Create paillier private key (requires paillier public key)
    // Use decrypt method which takes in partial decryptions and combines them
    const partial_decryption =  await py`PaillierSharedKey (
      ${private_key.n}, 
      ${private_key.threshold} , 
      ${private_key.id}, 
      ${private_key.s}, 
      ${delta}, 
      ${extra_factor}, 
      ${private_key.rand_exp}).decrypt(
        {
            1: ${partial_dict[1]},
            2: ${partial_dict[2]}
        }
      ).digits()`
    
    end();
    
    return parseInt(partial_decryption)
    
    
    }