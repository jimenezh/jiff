const share = require("../../../lib/client/share");

module.exports = function (jiffClient, party_count) {
  // Receive shares from all parties that submitted to jiffClient.id
  console.log('computing', jiffClient.id)
  var shares = {};
  for (var i = 2; i <= party_count; i++) {
    shares[i] = jiffClient.share(null, 1, [jiffClient.id], [i])[i];
  }

  // Sum everyone's shares by multiplying Paillier shares
  var sum = shares[2];
  for (var p = 3; p <= party_count; p++) {
    sum = sum.smult(shares[p]);
  }

  // Open the resulting sum only the party
  return jiffClient.open(sum, [jiffClient.id]);
};