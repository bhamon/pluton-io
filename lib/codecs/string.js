'use strict';

const DEFAULT_CHARSET = 'utf-8';

function encode(_data, _params) {
  return Buffer.from(_data, _params.charset || DEFAULT_CHARSET);
}

function decode(_buffer, _params) {
  return _buffer.toString(_params.charset || DEFAULT_CHARSET);
}

module.exports = {
  encode,
  decode
};
