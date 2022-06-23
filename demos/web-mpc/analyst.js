// Dependencies
const BigNumber = require('bignumber.js');
var path = require('path');
var fs = require('fs');
var readline = require('readline');

var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var JIFFClient = require('../../lib/jiff-client.js');
var mpc = require('./sharing/mpc.js');

const partial_dec = require('./paillier/partial_dec');
const get_server_partial_dec = require('./sharing/get_other_partial_dec');
const share_comb = require('./paillier/share_comb');
const partial_rand_rec = require('./paillier/partial_rand_rec');
const rand_comb = require('./sharing/rand_comb.js');

// Key Constants 
const t = 2 // threshold for Paillier decryption
const party_count = 2
const python_id = 2
// Initializing key variables
var n; // Public key
var secret_key; // Secret decryption key
var randomness_exp; // Secret randomness recovery exponent

// Loading keys
var KEYS_FILE = 'keys.json';
try {
  var obj = require('./' + KEYS_FILE);
  n = BigNumber(obj.n);
  secret_key = BigNumber(obj.analyst_secret_key);
  randomness_exp = BigNumber(obj.analyst_randomness_exponent)
} catch (err) {
  // key file does not exist
  return;
}

// Computing n^2, modulus for encryption/decryption
var n_square = n.pow(2)

// Creating full private key object
const private_key = {
  n: n,
  threshold: t,
  id: python_id,
  s: secret_key, 
  party_count: party_count,
  rand_exp: randomness_exp
}

// For reading actions from the command line
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Options for creating the jiff instance
var options = {
  crypto_provider: true, // do not bother with preprocessing for this demo
  party_id: 1, // we are the analyst => we want party_id = 1
  Zp: n_square,
  safemod: false
};

options.hooks = {
  computeShares: function(instance, secret, parties_list, threshold, Zp){
    var share_map = {}
    parties_list.forEach( id => share_map[id] = secret)
    return share_map
  },
}


// Create the instance
var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

// Applying big number extension
jiffClient.apply_extension(jiff_bignumber);

// Wait for server to connect
jiffClient.wait_for(['s1'], function () {  
  // Wait for user input
  console.log('Computation initialized!');
  console.log('Hit enter when you decide it is time to compute!');
  rl.on('line', function (_) {
    // Send begin signal
    jiffClient.emit('begin', [ 's1' ], '');

    // Receive number of parties from server
    jiffClient.listen('number', function (_, party_count) {
      // Computation starts
      party_count = parseInt(party_count);
      console.log('BEGIN: # of parties ' + party_count);


      mpc(jiffClient, party_count).then(function (sum_ciphertext) {
        console.log("SUM CIPHERTEXT IS: ", sum_ciphertext.toPrecision())

        // Get partial decryption
        partial_dec(private_key, sum_ciphertext).then(function (partial_decryption){
        console.log("PARTIAL DECRYPTION IS: ",  partial_decryption.toPrecision())

        // Share with server
        jiffClient.share(partial_decryption, 1, ['s1'], [ jiffClient.id ]);
        // Server's partial dec
        get_server_partial_dec(jiffClient, partial_decryption).then(function (server_partial_dec){
          // Share combine to get plaintext
          partial_dict = {1: partial_decryption, 2: server_partial_dec}
          share_comb(private_key, partial_dict).then(function (plaintext){
            console.log("TOTAL SUM IS: ", plaintext.toPrecision());
            
            // Randomness Recovery
          // Compute randomness of sum
          partial_rand_rec(private_key, sum_ciphertext, plaintext).then(function (rand){
            console.log("PARTIAL RANDOMNESS IS: ", rand.toPrecision());
            // Get total randomness, i.e. the product of analyst and server's partial randomness
            rand_comb(jiffClient, rand).then(function (total_rand){
              console.log("TOTAL RANDOMNESS IS:", total_rand.toPrecision())
              // Verification step?

              jiffClient.disconnect(true, true);
              rl.close();
            });
          });
          })
        })


        

    });
      });
    });
  });
});