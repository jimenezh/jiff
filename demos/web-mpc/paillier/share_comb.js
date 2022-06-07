module.exports = async function (private_key,  partial_dict) {
    const BigNumber = require('bignumber.js');
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
    
    const n_string = private_key.n.toPrecision()
    const s_string = private_key.s.toPrecision()
    const rand_exp_string = private_key.rand_exp.toPrecision()
    const partial1 = partial_dict[1].toPrecision()
    const partial2 = partial_dict[2].toPrecision()
    
    // Create paillier private key (requires paillier public key)
    // Use decrypt method which takes in partial decryptions and combines them
    const partial_decryption =  await py`str(PaillierSharedKey (
      int(${n_string}), 
      ${private_key.threshold} , 
      ${private_key.id}, 
      int(${s_string}), 
      ${delta}, 
      ${extra_factor}, 
      int(${rand_exp_string})).decrypt(
        {
            1: int(${partial1}),
            2: int(${partial2})
        }
      ).digits())`
    
    end();
    
    return BigNumber(partial_decryption)
    
    
    }