var JIFFClient = require('../../lib/jiff-client.js');
const BigNumber = require('bignumber.js');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');
const paillierBigint = require('paillier-bigint');

const share = require('../../lib/client/share.js');

const k = 52;
const kBN = BigNumber(k);
const ring = BigNumber(2).pow(kBN);


options = {
  safemod: false
}

options.hooks = {
  computeShares: function (instance, secret, parties_list, threshold, Zp) {
    share_map = {}
    parties_list.forEach(id => share_map[id] = ciphertext)
    return share_map
  }
}

// Read command line arguments
var input = BigNumber(process.argv[2], 10);

var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);
// Applyying big number extension
jiffClient.apply_extension(jiff_bignumber);

// Wait for server to connect
jiffClient.wait_for([1, 's1'], function () {
  console.log('Connected! ID: ' + jiffClient.id);
  jiffClient.listen('public key server', function (_, response) {
    // Parsing response
    strarray = response.split(",");
    serverN = strarray[0];
    party_count = strarray[1];
    // Creating public key for servrer
    const serverNBI = BigInt(serverN);
    const serverNBN = BigNumber(serverN);
    const publicKeyServer = new paillierBigint.PublicKey(serverNBI, serverNBI + 1n);
    console.log("Received public key from server", publicKeyServer.n);


    jiffClient.listen('public key analyst', function (_, analystN) {
      // Public key analyst
      const analystNBI = BigInt(analystN);
      const analystNBN = BigNumber(analystN);
      const publicKeyAnalyst = new paillierBigint.PublicKey(analystNBI, analystNBI + 1n);
      console.log("Received public key from analyst", publicKeyAnalyst.n);

      // Generate random share for server by choosing number mod 2^k and then encrypting
      sign = jiffClient.helpers.random(1).eq(BigNumber(0)) ? -1 : 1;
      share1Plaintext = jiffClient.helpers.random(ring).times(sign);
      share1Mod = jiffClient.helpers.mod(share1Plaintext, ring);
      // Encrypt
      share1BI = publicKeyServer.encrypt(BigInt(share1Mod.toPrecision()));
      // Make into bignumber
      share1 = BigNumber(share1BI.toString());
      

      // Make analyst's share so that the total sums to the secret
      share2Plaintext = input.plus(share1Plaintext.times(-1));
      share2Mod = jiffClient.helpers.mod(share2Plaintext, ring);
      // Encrypt as before
      share2BI = publicKeyAnalyst.encrypt(BigInt(share2Mod.toPrecision()));
      share2 = BigNumber(share2BI.toString());

      jiffClient.share(share1, 1, ['s1'], [jiffClient.id], serverNBN.pow(2));
      jiffClient.share(share2, 1, [1], [jiffClient.id], analystNBN.pow(2));

      console.log('Shared input!', input.toPrecision());
      jiffClient.disconnect(true, true);
      console.log('Disconnected!');
    });
  });
});

