// Dependencies
const BigNumber = require('bignumber.js');
var http = require('http');
var JIFFServer = require('../../lib/jiff-server.js');
var jiffBigNumberServer = require('../../lib/ext/jiff-server-bignumber');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
var sumShares = require('./sharing/sum_paillier_shares.js');
const paillierBigint = require('paillier-bigint');
const genRandomnessRecKey = require('./paillier/gen_randrec_key.js');
const recoverRandomness = require('./paillier/recover_randomness');
const writeResults = require('./performance/write_results_compute_parties');
// Create express and http servers
var express = require('express');
const { performance } = require('perf_hooks');
const remOverflow = require('./paillier/rem_overflow.js');
var app = express();
http = http.Server(app);

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID })


// key size
kappa = 2048;
// Ring size 
k = 52

// Start of key gen
start_keygen = performance.now()
paillierBigint.generateRandomKeys(kappa, true).then(function ({ publicKey, privateKey }) {
  end_keygen = performance.now()
  // Big Number Version for later
  const serverN = BigNumber(publicKey.n.toString());
  const serverNSquare = serverN.pow(2);

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
    Zp: serverNSquare,
    hooks: {
      computeShares: function (instance, secret, parties_list, threshold, ring) {
        share_map = {}
        parties_list.forEach(id => share_map[id] = ciphertext)
        return share_map
      },
      receiveShare: [function (instance, sender_id, share) {
        return share
      }],
      receiveOpen: [function (instance, sender_id, share, Zp) {
        return share

      }]
    }
  });
  computationClient.apply_extension(jiff_bignumber);

  console.log('Key generation is finished!');

  start_keygenrand = performance.now()
  // Randomness recovery key
  const { phiN, x } = genRandomnessRecKey(computationClient, serverN, privateKey._p, privateKey._q);
  end_keygenrand = performance.now()

  computationClient.wait_for([1], function () {
    // Send public key to analyst
    computationClient.emit('public key', [1], serverN.toString(10));
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
          computationClient.emit('public key server', [id], serverN.toString(10) + "," + party_count.toString());
        }

        // Wait for signal that input parties have keys and have sent input
        computationClient.listen('begin', function (_) {
          console.log("All input parties have submitted inputs. Starting computations!")
          // Computations
          start_comp = performance.now()
          sumShares(computationClient, party_count).then(function (sumEncryptionBN) {

            sumEncryptionBI = BigInt(sumEncryptionBN.toString(10));

            sumPlaintextBI = privateKey.decrypt(sumEncryptionBI);

            sumPlaintextBN = BigNumber(sumPlaintextBI.toString());

            // Remove Overflow from sumEncryption
            var { C, cPrimeBN } = remOverflow(computationClient, kappa, k, party_count - 1, serverN, phiN, serverNSquare, sumEncryptionBN, sumPlaintextBN, publicKey);

            // Decrypting c prime
            cPrimeBI = BigInt(cPrimeBN.toString(10));
            mPrimeBI = privateKey.decrypt(cPrimeBI);
            mPrimeBN = BigNumber(mPrimeBI.toString());

            // Get randomness
            const r = recoverRandomness(computationClient, serverN, x, mPrimeBN, cPrimeBN);
            const rBI = BigInt(r.toString(10));

            console.log("C IS", sumEncryptionBI);
            console.log("0/1 CIPHERTEXTS ARE", C)
            console.log("C' IS", cPrimeBI);
            console.log("M' IS", mPrimeBI);
            console.log("R' IS", rBI);

            console.log(mPrimeBI, rBI, cPrimeBI, "==", publicKey.encrypt(mPrimeBI, rBI));
            end_comp = performance.now()

            keygenPerf = end_keygen-start_keygen+end_keygenrand+start_keygen;
            compPerf = end_comp-start_comp;
            console.log("Key Gen took:", keygenPerf);
            console.log("Computations took", compPerf);

            writeResults(process.argv[2], keygenPerf.toString(), compPerf.toString());

            // Sending to Analyst
            computationClient.emit('result', [1], mPrimeBN.toString(10));

            // clean shutdown
            setTimeout(function () {
              console.log('Shutting Down!');
              http.close();
            }, 1000);
          });
        })
      });
    });
  });
});

http.listen(8080, function () {
  console.log('listening on *:8080');
});

console.log('web-mpc demo..');
console.log('The steps for running are as follows:');
console.log('1. Run the analyst (node analyst.js) when directed to (after server generates keys)');
console.log('2. Run "node input-party.js <input number>" to create a new input party and submit its input after the analyst has finished computing its keys');
console.log('3. When all input parties have joined, press enter in the analut terminal so input parties can send their input');
console.log('4. When desired, press enter in the analyst terminal to compute the output and close the session');