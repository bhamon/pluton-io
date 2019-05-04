'use strict';

const PARAM_SEPARATOR = ';';
const VALUE_SEPARATOR = '=';

function parse(_contentType) {
  const parts = _contentType.split(PARAM_SEPARATOR);
  const mimeType = parts[0].trim();
  const params = {};
  for (let i = 1; i < parts.length; ++i) {
    const split = parts[i].split(VALUE_SEPARATOR);
    const key = split[0].trim();
    const value = split.slice(1).join(VALUE_SEPARATOR).trim();

    params[key] = value;
  }

  return {
    mimeType,
    params
  };
}

module.exports = {
  parse
};
