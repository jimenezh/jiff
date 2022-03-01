module.exports = function (jiffClient, party_count) {
    // Receive shares from all parties that submitted
    var shares = {};
    for (var i = 2; i <= party_count; i++) {
      shares[i] = jiffClient.share(null, 1, [1, 's1'], [ i ])[i];
    }
    
    // New dummy share
    // TODO: add code to combine ciphertext shares
    decrypted_ciphertext = new jiffClient.SecretShare(16, ['s1', 1], 1, jiffClient.Zp);
  
    // Open the resulting sum only to the analyst
    return jiffClient.open(decrypted_ciphertext, ['s1', 1]);
  };