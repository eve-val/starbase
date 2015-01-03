#! /bin/sh

# See LICENSE file for license info

(cd build && rm -f sqlite-latest.sqlite.bz2 && rm -f sqlite-latest.sqlite && wget https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2 && bzip2 -d sqlite-latest.sqlite.bz2 && make && cd ../ && npm update && bower update && gulp)
