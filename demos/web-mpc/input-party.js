var JIFFClient = require('../../lib/jiff-client.js');

const encrypt = require('./paillier/encrypt');

const n = 799
const n_2 = n*n
const g = n+1

options = {
  Zp: n_2,
  safemod: false
}

options.hooks = {
  computeShares: function(instance, ciphertext, parties_list, threshold, Zp){
    ciphertext = ciphertext.toString()

    share_map = {}

    parties_list.forEach( id => share_map[id] = ciphertext)

    return share_map

  }
}

// Read command line arguments
var input = parseInt(process.argv[2], 10);
encrypt(n, input).then(function (ciphertext){
  var jiffClient = new JIFFClient('http://localhost:8080', 'web-mpc', options);

  // Wait for server to connect
  jiffClient.wait_for([1, 's1'], function () {
    console.log('Connected! ID: ' + jiffClient.id);
    jiffClient.share(ciphertext, 1, [1, 's1'], [ jiffClient.id ]);
    console.log('Shared input!');
    jiffClient.disconnect(true, true);
    console.log('Disconnected!');
  });
});

