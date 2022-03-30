module.exports = function (jiffClient, partial_rand) {
    // Receive shares from all parties that submitted
    shares = jiffClient.share(partial_rand, 1, [1, 's1'], [ 1,'s1' ]);
    
    // Multiply everyone's shares
    var total_rand = shares['s1'].smult(shares['1'])

    // Open the resulting sum only to the analyst
    return jiffClient.open(total_rand,  ['s1', 1]);
  };