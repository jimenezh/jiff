// Dependencies
var path = require('path');
var fs = require('fs');
var readline = require('readline');

var JIFFClient = require('../../lib/jiff-client.js');
var mpc = require('./sharing/mpc.js');

const partial_dec = require('./paillier/partial_dec');
const get_server_partial_dec = require('./sharing/get_other_partial_dec');
const share_comb = require('./paillier/share_comb');
const partial_rand_rec = require('./paillier/partial_rand_rec');
const rand_comb = require('./sharing/rand_comb.js');

const n = 145003400227199117427696322487384636953
const n_2 = n*n
const g = n+1
const s_analyst = 5148292062135500173989854104139388859592433720747476073486135662536290386530
const phi_n = 6831438583059476760
const n_inv_mod_phi_n = 820306736477769193
const randomness_exp = 820306736477769190
const t = 2
const party_count = 2
const python_id = 2

const private_key = {
  n: n,
  threshold: t,
  id: python_id,
  s: s_analyst, 
  party_count: party_count,
  rand_exp: randomness_exp
}
// Handle storing and loading keys
var KEYS_FILE = 'keys.json';
function save_keys() {
  var public_key = '['+jiffClient.public_key.toString()+']';
  var secret_key = '['+jiffClient.secret_key.toString()+']';
  var obj = '{ "public_key": ' + public_key + ', "secret_key": ' + secret_key + '}';
  fs.writeFileSync(path.join(__dirname, KEYS_FILE), obj);
}
function load_keys() {
  try {
    var obj = require('./' + KEYS_FILE);
    obj.secret_key = new Uint8Array(obj.secret_key);
    obj.public_key = new Uint8Array(obj.public_key);
    return obj;
  } catch (err) {
    // key file does not exist
    return { public_key: null, secret_key: null };
  }
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
  Zp: n_2,
  safemod: false
};

// Load the keys in case they were previously saved (otherwise we get back nulls)
var keys = load_keys();
options.public_key = keys.public_key;
options.secret_key = keys.secret_key;

options.hooks = {
  computeShares: function(instance, secret, parties_list, threshold, Zp){
    var share_map = {}
    parties_list.forEach( id => share_map[id] = secret)
    return share_map
  },
  receiveShare: [function(instance, sender_id, share){
    return share
  }]
}


// Create the instance
var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

// Wait for server to connect
jiffClient.wait_for(['s1'], function () {  
  save_keys(); // save the keys in case we need them again in the future

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
        console.log("SUM CIPHERTEXT IS: ", sum_ciphertext)

        // Get partial decryption
        partial_dec(private_key, sum_ciphertext).then(function (partial_decryption){
        console.log("PARTIAL DECRYPTION IS: ",  partial_decryption)

        // Share with server
        jiffClient.share(partial_decryption, 1, ['s1'], [ jiffClient.id ]);
        // Server's partial dec
        get_server_partial_dec(jiffClient, partial_decryption).then(function (server_partial_dec){
          // Share combine to get plaintext
          partial_dict = {1: partial_decryption, 2: server_partial_dec}
          share_comb(private_key, partial_dict).then(function (plaintext){
            console.log("TOTAL SUM IS: ", plaintext);
            
            // Randomness Recovery
          // Compute randomness of sum
          partial_rand_rec(private_key, sum_ciphertext, plaintext).then(function (rand){
            console.log("PARTIAL RANDOMNESS IS: ", rand);
            // Get total randomness, i.e. the product of analyst and server's partial randomness
            rand_comb(jiffClient, rand).then(function (total_rand){
              console.log("TOTAL RANDOMNESS IS:", total_rand)
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