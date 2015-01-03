#! /bin/sh

# See LICENSE file for license info

(cd build && wget https://www.fuzzwork.co.uk/dump/sqlite-latest.sqlite.bz2 && bzip2 -d sqlite-latest.sqlite.bz2 && make)
(npm install && sudo npm install -g bower gulp && bower install && gulp)
