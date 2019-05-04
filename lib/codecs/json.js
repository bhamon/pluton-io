'use strict';

const bourne = require('bourne');

const codecString = require('./string');

function encode(_data, _config) {
  return codecString.encode(JSON.stringify(_data), _config);
}

function decode(_buffer, _config) {
  return bourne.parse(codecString.decode(_buffer, _config));
}

module.exports = {
  encode,
  decode
};
