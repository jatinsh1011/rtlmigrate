const { processFile } = require('./fileProcessor');
const { transformJs } = require('./transformers/jsTransform');
const { transformCss } = require('./transformers/cssTransform');

module.exports = { processFile, transformJs, transformCss };
