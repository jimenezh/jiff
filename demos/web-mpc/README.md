# WEB-MPC in JIFF
A (basic) demo for asynchronously and securly summing secrets from many input parties, with only two compute parties: a server, and an analyst.

## Roles
We have three roles:
* Server (server.js): handles routing and storing all communications, and participates in the final aggregation with analyst.
* Analyst (analyst.js): Sets up the computation initially by providing a computation id (similar to session id), a public key, and a maximum number of (input) parties to the server.
In addition, when the analyst chooses, the aggregation is executed in MPC between the analyst and the server.
* Input party (input-party.js): Secret shares its input between the server and the analyst. Sends both shares to the server: one encrypted under the server's public key, and the other under the analyst's public key.

## Execution
1. Run the server:
``` node server.js ```
2. Run the analyst to setup the computation:
``` node analyst.js```
3. Run as many input parties as desired:
``` node input-party.js ($INPUT\_VALUE) ```
4. Hit enter into the analyst's terminal when all input parties have joined
5. Press enter once all input parties have sent their input to start computation.

The order of these steps can be changed as follows:
1. Analyst must wait until the server finishes its key generation
4. Input parties can only run after analyst runs: since they need its public key and the computation id. 

## The OUV Protocol
The OUV protocol allows for secure addition by leveraging Paillier Encryption over a ring. Computation parties (server + analyst) generate Paillier keys and provide the public with their public Paillier keys. Input parties generate two additive shares over the ring that add to their input and encrypt one with the server's public key and the other with the analyst's public key. Once the compute parties receive all the encryptions under their own key, they sum these and decrypt the sum. An important part is that the compute parties only public the sum plaintext mod the ring. In order to have verifiability in this part of the protocol, the compute parties verifiable remove the overflow bots from the sum ciphertext, and post the original ciphertext, the resulting ciphertext without the overflow bits, the plaintext mod the ring, and the randomness corresponding the plaintext-ciphertext pair. The sum from each compute party can then be summed into the sum of all the input parties' inputs.

A verifier can easily check the computations by checking that the input parties' encryptions um to the ciphertext posted by the compute parties and that these indeed correspondings to the ciphertext without the overflow bit. After, the verifier can re-encrypt the plaintext mode the ring with the randomness and check that it's equal to the resultig ciphertext posted.

## Paillier Encryption

This demo was built upon the original web-mpc demo. For paillier encryption, [paillier-bigint](https://github.com/juanelas/paillier-bigint) was used. 

## Keys
This section refers to the keys used for communication between partie that JIFF uses, NOT the Paillier keys.

By default, jiff generates a random public/private key pair for every party whenever a party is created.

The analyst needs to have the same private key that was used to initialize the computation in order to run aggregation, otherwise all shares encrypted by the input
parties using the previous key are un-retrievable.

Therefore, analyst.js will automatically save the public/private key pair in a file named keys.json when run.
Whenever analyst.js is run, it will automatically look for that file and utilize these keys.
If the file does not exist or has a bad format, it will use new keys.

Finally, the server is usually responsible for delivering all parties keys to each other. If you do not wish to trust the server to perform this step (e.g. man in the middle attacks),
you have to ensure delivery of the keys to the parties via some other channel (e.g. post request to the analyst directly, reading from a file, etc), and make sure these keys
are passed to the constructor of JIFFClient at the input parties, in a similar way to how analyst.js loads keys.


## Future Work
- Creating a Paillier library using BigNumber to resolve the conversions between BigInt and BigNumber
- Generating additive shares along with the JIFF workflow rather than separately
- Adding ZKP for Paillier public keys from [TumbleBit](https://github.com/osagga/TumbleBitSetup)
- Cut + Choose pre-processing for the 0/1 encryptions used to remove overflow bits
