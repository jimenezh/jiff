module.exports = async function (private_key,  raw_ciphertext, plaintext) {
    const BigNumber = require('bignumber.js');
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

    const ciphertext_string = raw_ciphertext.toPrecision()
    const plaintext_string = plaintext.toPrecision()
    const n_string = private_key.n.toPrecision()
    const s_string = private_key.s.toPrecision()
    const rand_exp_string = private_key.rand_exp.toPrecision()

    // Create a Paillier private key to use private key methods
    // For this, we need a paillier public key to encrypt the raw input ciphertext
    // use partial rand rec method
    // Since python-bridge only allows return of ints, we do this all in one step
    const partial_decryption =  await py`str(PaillierSharedKey (
    int(${n_string}), 
    ${private_key.threshold} , 
    ${private_key.id}, 
    int(${s_string}), 
    ${delta}, 
    ${theta}, 
    int(${rand_exp_string})).partial_randomness_recovery(
        PaillierCiphertext(
        int(${ciphertext_string}),
        Paillier(
            public_key=PaillierPublicKey(
                int(${n_string}), 
                int(${n_string})+1),
            secret_key=None,
            share_secret_key=False
            )
        ),
        int(${plaintext_string})  
    ))`

    end();

    return BigNumber(partial_decryption)
}