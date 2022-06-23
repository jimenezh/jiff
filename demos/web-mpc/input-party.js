var JIFFClient = require('../../lib/jiff-client.js');
const BigNumber = require('bignumber.js');
var jiff_bignumber = require('../../lib/ext/jiff-client-bignumber');

const encrypt = require('./paillier/encrypt');

var KEYS_FILE = 'keys.json';
try {
  var obj = require('./' + KEYS_FILE);
  n = BigNumber(obj.n);
} catch (err) {
  // key file does not exist
  return;
}

const n_square = n.pow(2)

options = {
  Zp: n_square,
  safemod: false
}

options.hooks = {
  computeShares: function(instance, ciphertext, parties_list, threshold, Zp){

    share_map = {}

    parties_list.forEach( id => share_map[id] = ciphertext)

    return share_map

  }
}

// Read command line arguments
var input = BigNumber(process.argv[2], 10);
encrypt(n, input).then(function (ciphertext){
  var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);
  // Applyying big number extension
  jiffClient.apply_extension(jiff_bignumber);

  // Wait for server to connect
  jiffClient.wait_for([1, 's1'], function () {
    console.log('Connected! ID: ' + jiffClient.id);
    jiffClient.share(ciphertext, 1, [1, 's1'], [ jiffClient.id ]);
    console.log('Shared input!', ciphertext.toPrecision());
    jiffClient.disconnect(true, true);
    console.log('Disconnected!');
  });
});

