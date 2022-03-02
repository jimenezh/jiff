module.exports = function (jiffClient, partial_decryption) {
    // Receive shares from all parties that submitted
    shares = jiffClient.share(partial_decryption, 1, [1, 's1'], [ 1,'s1' ]);
    
    // New dummy share
    // TODO: add code to combine ciphertext shares
    decrypted_ciphertext = new jiffClient.SecretShare(16, ['s1', 1], 1, jiffClient.Zp);
  
    // Open the resulting sum only to the analyst
    return jiffClient.open(decrypted_ciphertext, ['s1', 1]);
  };