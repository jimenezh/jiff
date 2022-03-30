module.exports = async function (private_key,  raw_ciphertext, plaintext) {
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

    // Constants needed for private key
    const delta = await py`factorial(${private_key.party_count})`
    const theta = await py`4*(${delta}**2)`

    // Create a Paillier private key to use private key methods
    // For this, we need a paillier public key to encrypt the raw input ciphertext
    // Since python-bridge only allows return of ints, we do this all in one step
    const partial_decryption =  await py`int(PaillierSharedKey (
    ${private_key.n}, 
    ${private_key.threshold} , 
    ${private_key.id}, 
    ${private_key.s}, 
    ${delta}, 
    ${theta}, 
    ${private_key.rand_exp}).partial_randomness_recovery(
        PaillierCiphertext(
        ${raw_ciphertext},
        Paillier(
            public_key=PaillierPublicKey(${private_key.n}, ${private_key.n}+1),
            secret_key=None,
            share_secret_key=False
            )
        ),
        ${plaintext}  
    ))`

    end();

    console.log("Partial decryption is ", partial_decryption)

    return partial_decryption


}