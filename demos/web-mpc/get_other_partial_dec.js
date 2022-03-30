const share = require('../../lib/client/share');

module.exports = async function (jiffClient, partial_decryption) {
    // Receive shares from all parties that submitted
    shares = jiffClient.share(partial_decryption, 1, [1, 's1'], [ 1,'s1' ]);
    var other_id

    // Figure out which share the computing party doesn't have
    console.log(jiffClient.id)
    if( jiffClient.id == 1){
      other_id = 's1'
    } else {
      other_id = 1
    }
    console.log("other ", other_id, shares[other_id])

    return jiffClient.open(shares[other_id], [jiffClient.id]);
  };