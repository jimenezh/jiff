var JIFFClient = require('../../lib/jiff-client.js');

const paillierBigint = require('paillier-bigint');
const share = require('../../lib/client/share.js');

const n = 799
const n_2 = n*n
const g = n+1

var public_key = new paillierBigint.PublicKey(799n, 800n)




options = {
  Zp: n_2,
  safemod: false
}

options.hooks = {
  computeShares: function(instance, secret, parties_list, threshold, Zp){
    console.log("Computing shares from ", secret)

    share_ciphertext = public_key.encrypt(secret)

    share_ciphertext = share_ciphertext.toString()

    share_map = {}

    parties_list.forEach( id => share_map[id] = share_ciphertext)

    console.log("share map is ", share_map)

    return share_map

  }
}

// Read command line arguments
var input = parseInt(process.argv[2], 10);
var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

// Wait for server to connect
jiffClient.wait_for([1, 's1'], function () {
  console.log('Connected! ID: ' + jiffClient.id);
  jiffClient.share(input, 1, [1, 's1'], [ jiffClient.id ]);
  console.log('Shared input!');
  jiffClient.disconnect(true, true);
  console.log('Disconnected!');
});

