const fs = require('fs');
const path = require('path');
const { transformJs } = require('./transformers/jsTransform');
const { transformCss } = require('./transformers/cssTransform');

const JS_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CSS_EXTS = new Set(['.css', '.scss']);

function processFile(filePath, opts = {}) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  let result;
  if (JS_EXTS.has(ext)) {
    result = transformJs(original, filePath, opts);
  } else if (CSS_EXTS.has(ext)) {
    result = transformCss(original, filePath, opts);
  } else {
    return { skippedFile: true, reason: `unsupported extension ${ext}` };
  }

  const changed = result.code !== original;
  if (changed && opts.write) {
    fs.writeFileSync(filePath, result.code, 'utf8');
  }

  return { filePath, original, output: result.code, changed, report: result.report };
}

module.exports = { processFile };
