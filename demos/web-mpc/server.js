// Dependencies
const BigNumber = require('bignumber.js');
var http = require('http');
var JIFFServer = require('../../lib/jiff-server.js');
var jiffBigNumberServer = require('../../lib/ext/jiff-server-bignumber');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var mpc = require('./sharing/mpc.js');

// Create express and http servers
var express = require('express');
var app = express();
http = http.Server(app);

// Paillier functions
const partial_dec = require('./paillier/partial_dec');
const get_analyst_partial_dec = require('./sharing/get_other_partial_dec.js');
const share_comb = require('./paillier/share_comb')
const partial_rand_rec = require('./paillier/partial_rand_rec');
var rand_comb = require('./sharing/rand_comb.js');

// 128 bit keys
const n = BigNumber('264080106179843937231700072110084466873')
const n_square = n.pow(2)
const g = n.plus(1)
const s_server =  BigNumber('16071460339175104308170947290468225669384778818848587680139105047649794055412')
const n_inv_mod_phi_n = 18327295311094937137n
const randomness_exp = BigNumber('7')
const t = 2
const party_count = 2
const python_id = 1

const private_key = {
  n: n,
  threshold: t,
  id: python_id,
  s: s_server, 
  party_count: party_count,
  rand_exp: randomness_exp
}

// var public_key = new paillierBigint.PublicKey(90385s3n, 903854n)

// Create JIFF server
var jiff_instance = new JIFFServer(http, {
  logs: false,
  socketOptions: {
    pingTimeout: 1000,
    pingInterval: 2000
  }
});
jiff_instance.computationMaps.maxCount['web-mpc'] = 100000; // upper bound on how input parties can submit!
jiff_instance.apply_extension(jiffBigNumberServer);

// Specify the computation server code for this demo
var computationClient = jiff_instance.compute('web-mpc', {
  crypto_provider: true,
  Zp: n_square,
  safemod: false,
  hooks: {
    computeShares: function(instance, secret, parties_list, threshold, Zp){
      var share_map = {}
      parties_list.forEach( id => share_map[id] = secret.toString())
      return share_map
    },
    receiveShare: [function(instance, sender_id, share){
      return share
    }]
  }
});
computationClient.apply_extension(jiff_bignumber);

computationClient.wait_for([1], function () {
  // Perform server-side computation.
  console.log('Computation initialized!');

  // When the analyst sends the begin signal, we start!
  computationClient.listen('begin', function () {
    console.log('Analyst sent begin signal!');

    // Get all connected parties IDs
    var party_count = 0;
    var party_map = jiff_instance.socketMaps.socketId['web-mpc'];
    for (var id in party_map) {
      if (party_map.hasOwnProperty(id)) {
        party_count++;
      }
    }

    // Send number of parties to analyst
    computationClient.emit('number', [ 1 ], party_count.toString());

    // execute the mpc protocol
    mpc(computationClient, party_count).then(function (sum_ciphertext) {
      console.log("SUM CIPHERTEXT IS: ", sum_ciphertext.toPrecision());

    // Partial decryption
    partial_dec(private_key, sum_ciphertext).then(function (partial_decryption){ 
    console.log("PARTIAL DECRYPTION IS:",  partial_decryption.toPrecision())
    // Share with client
    computationClient.share(partial_decryption, 1, [1], [ computationClient.id ]);  
    // Get analyst partial decryption
    get_analyst_partial_dec(computationClient, partial_decryption).then(function (analyst_partial_dec){
      // Share combine
      partial_dict = {1: partial_decryption, 2: analyst_partial_dec}
      share_comb(private_key,partial_dict ).then(function (plaintext){
        console.log("TOTAL SUM IS:", plaintext.toPrecision())

        // Randomness Recovery
        // Compute randomness of sum
        partial_rand_rec(private_key, sum_ciphertext, plaintext).then(function (rand){
          console.log("PARTIAL RANDOMNESS IS:", rand.toPrecision());
          rand_comb(computationClient, rand).then(function (total_rand){
              
            console.log("TOTAL RANDOMNESS IS:", total_rand.toPrecision())

            setTimeout(function () {
              console.log('Shutting Down!');
              http.close();
            }, 1000);
            });
          });
        });
      });
    });
      
      
    })});
});

http.listen(8080, function () {
  console.log('listening on *:8080');
});

console.log('web-mpc demo..');
console.log('The steps for running are as follows:');
console.log('1. Run the analyst (node analyst.js)');
console.log('2. After the analyst sets up the computation, you can choose to terminate it or leave it around');
console.log('3. Run "node input-party.js <input number>" to create a new input party and submit its input');
console.log('4. When desired, press enter in the analyst terminal (after re-running it if previously closed) to compute the output and close the session');