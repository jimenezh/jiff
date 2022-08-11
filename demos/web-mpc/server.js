// Dependencies
const BigNumber = require('bignumber.js');
var http = require('http');
var JIFFServer = require('../../lib/jiff-server.js');
var jiffBigNumberServer = require('../../lib/ext/jiff-server-bignumber');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var sumShares = require('./sharing/sum_paillier_shares.js');
const paillierBigint = require('paillier-bigint')

// Create express and http servers
var express = require('express');
const { send } = require('process');
var app = express();
http = http.Server(app);

// key size
kappa = 128;



paillierBigint.generateRandomKeys(kappa, true).then(function ({ publicKey, privateKey }) {
  console.log(publicKey)
  // Big Number Version for later
  const serverN = BigNumber(publicKey.n.toString());

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
    safemod: false,
    Zp: serverN.pow(2),
    hooks: {
      computeShares: function (instance, secret, parties_list, threshold, ring) {
        share_map = {}
        parties_list.forEach(id => share_map[id] = ciphertext)
        return share_map
      },
      receiveShare: [function (instance, sender_id, share) {
        console.log("received ", share.toPrecision(), sender_id)
        return share
      }],
      receiveOpen: [function (instance, sender_id, share, Zp) {
        console.log('open', share.toPrecision(), Zp.toPrecision())
        return share

      }]
    }
  });
  computationClient.apply_extension(jiff_bignumber);

  computationClient.wait_for([1], function () {

    // Perform server-side computation.
    console.log('Computation initialized!');


    // Send public key to analyst
    computationClient.emit('public key', [1], serverN.toPrecision());
    // Receive public key from analyst
    computationClient.listen('public key', function (_, analystN) {
      // Create Paillier public key with BigInt
      const analystNBI = BigInt(analystN)
      const publicKeyAnalyst = new paillierBigint.PublicKey(analystNBI, analystNBI + 1n);
      console.log('Analyst sent public key', publicKeyAnalyst.n);
      // Wait for all input parties to join
      computationClient.listen('ready', function () {
        // Get all connected parties IDs
        var party_count = 0;
        var party_map = jiff_instance.socketMaps.socketId['web-mpc'];
        for (var id in party_map) {
          if (party_map.hasOwnProperty(id)) {
            party_count++;
          }
        }
        // Send number of parties to analyst
        computationClient.emit('number', [1], party_count.toString());
        // Send public key and # parties to all input parties
        for (id = 2; id <= party_count; id++) {
          computationClient.emit('public key server', [id], serverN.toPrecision() + "," + party_count.toString());
        }

        // Wait for signal that input parties have keys and have sent input
        computationClient.listen('begin', function (_) {
          console.log("All input parties have submitted inputs. Starting computations!")
          // Computations
          sumShares(computationClient, party_count).then(function (sumEncryptionBN) {

            sumEncryptionBI = BigInt(sumEncryptionBN.toPrecision());

            sumPlaintextBI = privateKey.decrypt(sumEncryptionBI);

            sumPlaintextBN = BigNumber(sumPlaintextBI.toString());

            console.log('SUM IS', sumPlaintextBN.toPrecision());

            // Sending to Analyst
            computationClient.emit('result', [1], sumPlaintextBN.toPrecision());

          });
          // clean shutdown
          setTimeout(function () {
            console.log('Shutting Down!');
            http.close();
          }, 1000);
        })

      });



      // As compute parties, we have to
      /* 
      1. 
      1. Send public key to analyst
      1. Receive public key from analyst (assume there is one party)
      1. Get parties and send key to parties
      1.  Receive ready from analyst that input parties have keys
      1. send number of parties to analyst, who sends their public key
      1. Receive begin from analyst that input parties are done
      2. Receive shares from input parties -- 
      3. Sum shares (paillier) and decrypt
      4. Send to analyst --
      5. Receive from analyst -- 
      6. Compute sum again (plaintext) and output
      
      */

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