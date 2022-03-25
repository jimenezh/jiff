// Dependencies
var path = require('path');
var fs = require('fs');
var readline = require('readline');

var JIFFClient = require('../../lib/jiff-client.js');
var mpc = require('./mpc.js');

const partial_dec = require('./paillier/partial_dec')
const share_comb = require('./share_comb.js');
var rand_comb = require('./rand_comb.js');

const n = 799
const n_2 = n*n
const g = n+1
const s_analyst = 1584955
const phi_n = 736
const n_inv_mod_phi_n = 479
const randomness_exp = 100
const id = 1 
const t = 2
const party_count = 2

const private_key = {
  n: n,
  threshold: t,
  id: id,
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
    console.log("Computing shares of ", secret)
    var share_map = {}
    parties_list.forEach( id => share_map[id] = secret)
    return share_map
  },
  receiveShare: [function(instance, sender_id, share){
    console.log("Received ", share, " from ", sender_id)
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
        console.log("Ciphertext sum", sum_ciphertext)
        
        partial_dec(private_key, sum_ciphertext).then(function (partial_decryption){

        // For partial decryption we do c^(2*delta*s_i) mod n^2, where delta = factorial of num of computing parties = 2
        console.log("partial decryption",  partial_decryption)

        jiffClient.share(partial_decryption, 1, ['s1'], [ jiffClient.id ]);

        share_comb(jiffClient, party_count).then(function (sum){
          console.log('(DUMMY) PLAINTEXT SUM IS: ' +  sum);

          // Partial Randomness Phase
          // First step is to do (1-m*n)^x mod n where m is the plaintext message
          partial_rand = jiffClient.helpers.pow_mod((1-(sum*n)), randomness_exp, n)
          // Second step is multiplying by c, the ciphertext
          partial_rand = jiffClient.helpers.mod(sum_ciphertext*partial_rand , n)
          console.log("Partial Randomness is ", partial_rand)
          // Sharing
          

          rand_comb(jiffClient, partial_rand).then(function (total_rand){
            console.log("(DUMMY) total rand is ", total_rand)
          });

          jiffClient.disconnect(true, true);
          rl.close();
      });
      });
    })});
  });
});