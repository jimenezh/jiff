#!/bin/bash
# /bin/sh -ec "node server.js 0 && sllep 4 &"
# /bin/sh -ec "node analyst.js 0 && sllep 4 &"

exp=8

# echo $exp

power2=$((2**$exp))

# echo $power2

for var in `seq 1 $power2`
do
    node input-party.js $var $exp &
done
