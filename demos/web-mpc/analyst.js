// Dependencies
const BigNumber = require('bignumber.js');
var path = require('path');
var fs = require('fs');
var readline = require('readline');

var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var JIFFClient = require('../../lib/jiff-client.js');
var mpc = require('./sharing/sum_paillier_shares.js');
const paillierBigint = require('paillier-bigint');

const kappa = 128

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
  safemod: false
};

options.hooks = {
  computeShares: function (instance, secret, parties_list, threshold, Zp) {
    var share_map = {}
    parties_list.forEach(id => share_map[id] = secret)
    return share_map
  },
}


// Create the instance
var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

// Applying big number extension
jiffClient.apply_extension(jiff_bignumber);

// Wait for server to connect
jiffClient.wait_for(['s1'], function () {
  // Generate keys
  paillierBigint.generateRandomKeys(kappa).then(function ({ publicKey, privateKey }) {
    const N = BigNumber(publicKey.n.toString());

    // Sending public key to server
    jiffClient.emit('public key', ['s1'], N.toPrecision());
    // Receive server's public key
    jiffClient.listen('public key', function (_, serverN) {
      // Creating public key for servrer
      const serverNBI = BigInt(serverN);
      const publicKeyServer = new paillierBigint.PublicKey(serverNBI, serverNBI + 1n);
      console.log("Received public key from server", publicKeyServer.n);

      // Wait for user input
      console.log('Computation initialized!');
      console.log('Hit enter when all input parties have joined!');
      rl.once('line', function (_) {
        // Send begin signal
        jiffClient.emit('ready', ['s1'], '');

        // Receive number of parties from server
        jiffClient.listen('number', function (_, party_count) {
          // TODO: Send public key to input parties (assume 1)
          input_parties = ['2'];
          jiffClient.emit('public key analyst', input_parties, N.toPrecision());

          console.log('Hit enter to start computation!');
          // Computation starts
          party_count = parseInt(party_count);
          rl.once('line', function (_) {
            console.log('BEGIN: # of parties ' + party_count);
            jiffClient.emit('begin', ['s1'], '');
            // Computations

            jiffClient.disconnect(true, true);
            rl.close();

          });
        });
      });


    });
  });
}) 