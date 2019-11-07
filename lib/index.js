'use strict';

const http2 = require('http2');
const extend = require('extend');

const modelContentType = require('./contentType');
const modelMimeType = require('./mimeType');

const codecBinary = require('./codecs/binary');
const codecString = require('./codecs/string');
const codecJson = require('./codecs/json');

function factory(_server, _config) {
  const config = extend(true, {
    limit: 1048576,
    codecs: {
      [modelMimeType.BINARY]: codecBinary,
      [modelMimeType.TEXT]: codecString,
      [modelMimeType.HTML]: codecString,
      [modelMimeType.JSON]: codecJson
    }
  }, _config);

  const codecs = new Map(Object.entries(config.codecs));

  function read(_stream) {
    return new Promise((_resolve, _reject) => {
      const contentLength = _stream.in[http2.constants.HTTP2_HEADER_CONTENT_LENGTH] || NaN;
      if (contentLength > config.limit) {
        return _reject(new Error('Limit exceeded'));
      }

      function off() {
        _stream.native.off('error', onError);
        _stream.native.off('data', onData);
        _stream.native.off('end', onEnd);
      }

      function onError(_error) {
        off();
        return _reject(_error);
      }

      let buffer = Buffer.allocUnsafe(0);
      function onData(_chunk) {
        if (buffer.length + _chunk.length > config.limit) {
          off();
          return _reject(new Error('Limit exceeded'));
        }

        buffer = Buffer.concat([buffer, _chunk]);
      }

      function onEnd() {
        off();
        return _resolve(buffer);
      }

      _stream.native.on('error', onError);
      _stream.native.on('data', onData);
      _stream.native.on('end', onEnd);
    });
  }

  function parse(_stream, _raw) {
    const contentType = _stream.in[http2.constants.HTTP2_HEADER_CONTENT_TYPE] || modelMimeType.BINARY;
    const parsedContentType = modelContentType.parse(contentType);
    const codec = codecs.get(parsedContentType.mimeType);
    if (!codec) {
      throw new Error(`Unsupported [${parsedContentType.mimeType}] mime type`);
    }

    return codec.decode(_raw, parsedContentType.params);
  }

  function send(_stream, _data) {
    let contentType = _stream.out[http2.constants.HTTP2_HEADER_CONTENT_TYPE];
    if (!contentType) {
      if (Buffer.isBuffer(_data) instanceof Buffer) {
        contentType = modelMimeType.BINARY;
      } else if (typeof _data === 'string') {
        contentType = modelMimeType.TEXT;
      } else {
        contentType = modelMimeType.JSON;
      }
    }

    const parsedContentType = modelContentType.parse(contentType);
    const codec = codecs.get(parsedContentType.mimeType);
    if (!codec) {
      throw new Error(`Unsupported [${parsedContentType.mimeType}] mime type`);
    }

    const buffer = codec.encode(_data, parsedContentType.params);

    _stream.out[http2.constants.HTTP2_HEADER_CONTENT_TYPE] = contentType;
    _stream.out[http2.constants.HTTP2_HEADER_CONTENT_LENGTH] = buffer.length;
    _stream.native.respond(_stream.out);
    _stream.native.end(buffer);
  }

  _server.decorate('io', {
    setCodec(_mimeType, _codec) {
      codecs.set(_mimeType, _codec);
    },
    removeCodec(_mimeType) {
      codecs.delete(_mimeType);
    }
  });

  _server.decorateStream('type', function(_type) {
    this.out[http2.constants.HTTP2_HEADER_CONTENT_TYPE] = _type;
    return this;
  });

  _server.decorateStream('body', async function() {
    const raw = await read(this);
    return parse(this, raw);
  });

  _server.decorateStream('send', function(_data) {
    send(this, _data);
  });
}

module.exports = factory;
