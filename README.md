# RocksDB-JS

[![Build Status](https://travis-ci.org/greycat-incubator/RocksDB-JS.svg?branch=master)](https://travis-ci.org/greycat-incubator/RocksDB-JS)

Unofficial implementation of [GreyCat RocksDB plugin](https://github.com/datathings/greycat/tree/master/plugins/rocksdb) in Typescript/Javascript.

The plugin can be used exactly as the Java version.
The version is also compatible with the Java version: a database crated with the Java plugin can be accessed by the JS plugin and vice versa.

We use the [Level](https://github.com/Level) Rocksdb wrapper.

## Dependencies

- [GreyCat](https://github.com/datathings/greycat), v.10.7
- [LevelUp](https://github.com/Level/levelup), v2.0.2
    - [Level-RocksDB](https://github.com/Level/rocksdb), v2.0.0

## How to install

### Compiling by yourselfves

- git clone
- npm install 
- tsc
- enjoy :)

To test ([Maven](https://maven.apache.org/) should be installed on your computer):
- npm test

### Npm

- npm install greycatincub-level

## Todo

- [] LevelDB plugin

## How to use it

TBD

