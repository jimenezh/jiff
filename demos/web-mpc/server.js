// Dependencies
const BigNumber = require('bignumber.js');
var http = require('http');
var JIFFServer = require('../../lib/jiff-server.js');
var jiffBigNumberServer = require('../../lib/ext/jiff-server-bignumber');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var mpc = require('./sharing/sum_paillier_shares.js');
const paillierBigint = require('paillier-bigint')

// Create express and http servers
var express = require('express');
var app = express();
http = http.Server(app);

// key size
kappa = 128;


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
  // Zp: ,
  safemod: false,
  hooks: {
    computeShares: function (instance, secret, parties_list, threshold, Zp) {
      var share_map = {}
      parties_list.forEach(id => share_map[id] = secret.toString())
      return share_map
    },
    receiveShare: [function (instance, sender_id, share) {
      return share
    }]
  }
});
computationClient.apply_extension(jiff_bignumber);
paillierBigint.generateRandomKeys(kappa).then(function ({ publicKey, privateKey }) {

  // Big Number Version for later
  const serverN = BigNumber(publicKey.n.toString());

  computationClient.wait_for([1], function () {

    // Perform server-side computation.
    console.log('Computation initialized!');


    // Send public key to analyst
    computationClient.emit('public key', [1], serverN.toPrecision());
    // Receive public key from analyst
    computationClient.listen('public key', function (_, analystN) {
      // Create Paillier public key with BigInt
      const analystNBI = BigInt(analystN)
      const publicKeyAnalyst = new paillierBigint.PublicKey( analystNBI, analystNBI +1n);
      console.log('Analyst sent public key', publicKeyAnalyst.n);
      // Wait for all input parties to join
      computationClient.listen('ready', function () {
        // Get all connected parties IDs
        var party_count = 0;
        var party_map = jiff_instance.socketMaps.socketId['web-mpc'];
        for (var id in party_map) {
          if (party_map.hasOwnProperty(id)) {
            party_count++;
            // Send public key to all input parties
            computationClient.emit('public key server', [id], serverN.toPrecision());
          }
        }
        // Send number of parties to analyst
        computationClient.emit('number', [1], party_count.toString());

        // Wait for signal that input parties have keys and have sent input
        computationClient.listen('begin', function () {
          // Computations
          // clean shutdown
          setTimeout(function () {
            console.log('Shutting Down!');
            http.close();
          }, 1000);
        });

      });


    });
  });
})

http.listen(8080, function () {
  console.log('listening on *:8080');
});

console.log('web-mpc demo..');
console.log('The steps for running are as follows:');
console.log('1. Run the analyst (node analyst.js)');
console.log('2. After the analyst sets up the computation, you can choose to terminate it or leave it around');
console.log('3. Run "node input-party.js <input number>" to create a new input party and submit its input');
console.log('4. When desired, press enter in the analyst terminal (after re-running it if previously closed) to compute the output and close the session');