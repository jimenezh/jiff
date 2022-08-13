// Dependencies
const BigNumber = require('bignumber.js');
var path = require('path');
var fs = require('fs');
var readline = require('readline');

var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var JIFFClient = require('../../lib/jiff-client.js');
var sumShares = require('./sharing/sum_paillier_shares.js');
const paillierBigint = require('paillier-bigint');
const genRandomnessRecKey = require('./paillier/gen_randrec_key.js');
const recoverRandomness = require('./paillier/recover_randomness');

const kappa = 2048
const k = 52
const ring = BigNumber(2).pow(k)

// For reading actions from the command line
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Generate keys
paillierBigint.generateRandomKeys(kappa, true).then(function ({ publicKey, privateKey }) {
  const N = BigNumber(publicKey.n.toString());

  // Options for creating the jiff instance
  var options = {
    crypto_provider: true, // do not bother with preprocessing for this demo
    party_id: 1, // we are the analyst => we want party_id = 1
    safemod: false,
    Zp: N.pow(2)
  };

  options.hooks = {
    computeShares: function (instance, secret, parties_list, threshold, Zp) {
      var share_map = {}
      parties_list.forEach(id => share_map[id] = secret)
      return share_map
    },
    receiveShare: [function (instance, sender_id, share) {
      return share
    }],
    receiveOpen: [function (instance, sender_id, share, Zp) {
      return share
    }]
  }


  // Create the instance
  var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

  // Applying big number extension
  jiffClient.apply_extension(jiff_bignumber);

  // RR key
  const x = genRandomnessRecKey(jiffClient, N, privateKey._p, privateKey._q);

  // Wait for server to connect
  jiffClient.wait_for(['s1'], function () {


    // Sending public key to server
    jiffClient.emit('public key', ['s1'], N.toString(10));
    // Receive server's public key
    jiffClient.listen('public key', function (_, serverN) {
      // Creating public key for servrer
      const serverNBI = BigInt(serverN);
      const publicKeyServer = new paillierBigint.PublicKey(serverNBI, serverNBI + 1n);
      console.log("Received public key from server", publicKeyServer.n);

      // Wait for user input
      console.log('Key generation is finished!');
      console.log('Hit enter when all input parties have joined!');
      rl.once('line', function (_) {
        // Send begin signal
        jiffClient.emit('ready', ['s1'], '');

        // Receive number of parties from server
        jiffClient.listen('number', function (_, party_count) {
          // Send public key to input parties
          for (id = 2; id <= party_count; id++) {
            jiffClient.emit('public key analyst', [id], N.toString(10));
          }


          console.log('Hit enter to start computation!');
          // Computation starts
          party_count = parseInt(party_count);
          rl.once('line', function (_) {
            console.log('BEGIN: # of parties ' + party_count);
            jiffClient.emit('begin', ['s1'], '');
            // Computations
            sumShares(jiffClient, party_count).then(function (sumEncryptionBN) {
              sumEncryptionBI = BigInt(sumEncryptionBN.toString(10));

              sumPlaintextBI = privateKey.decrypt(sumEncryptionBI);

              sumPlaintextBN = BigNumber(sumPlaintextBI.toString());
              console.log('SUM IS', sumPlaintextBI);

              // Get randomness
              const r = recoverRandomness(jiffClient, N, x, sumPlaintextBN, sumEncryptionBN);
              const rBI = BigInt(r.toString(10));
              // Re-encrypt to check
              cprime = publicKey.encrypt(sumPlaintextBI, rBI);
              console.log("Plaintext", sumPlaintextBI, 'encrypted with ', rBI, ' is ', sumEncryptionBI, "==?", cprime)

              jiffClient.listen('result', function (_, serverSumString) {
                serverSumBN = BigNumber(serverSumString);
                total = jiffClient.helpers.mod(sumPlaintextBN.plus(serverSumBN), ring);

                console.log("TOTAL SUM IS", total.toString(10));

                jiffClient.disconnect(true, true);
                rl.close();
              });
            });

          });
        });
      });

    });
  });
}) 