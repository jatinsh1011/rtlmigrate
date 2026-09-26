const recast = require('recast');
const babelParser = require('recast/parsers/babel');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const { DIRECT_RENAME_MAP, POSITION_MAP } = require('../rules/propertyMap');
const { isCentering, isOffScreen, isZero } = require('../rules/heuristics');

// Matches `direction === 'ltr'`, `theme.direction === 'rtl'`, `dir == 'ltr'`, etc.
function isDirectionTest(node) {
  if (!t.isBinaryExpression(node) || (node.operator !== '===' && node.operator !== '==')) {
    return null;
  }
  const literalSide = t.isStringLiteral(node.right) ? node.right : t.isStringLiteral(node.left) ? node.left : null;
  if (!literalSide) return null;
  const value = literalSide.value.toLowerCase();
  return value === 'ltr' || value === 'rtl' ? value : null;
}

function getKeyName(prop) {
  if (!t.isObjectProperty(prop)) return null;
  if (t.isIdentifier(prop.key) && !prop.computed) return prop.key.name;
  if (t.isStringLiteral(prop.key)) return prop.key.value;
  return null;
}

function setKeyName(prop, newName) {
  if (t.isIdentifier(prop.key)) {
    prop.key = t.identifier(newName);
  } else {
    prop.key = t.stringLiteral(newName);
  }
}

function staticStringValue(node) {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return String(node.value);
  return null;
}

function convertDirectProperty(prop, name, report, filePath) {
  const newName = DIRECT_RENAME_MAP[name];
  let newValueNode = prop.value;

  if (t.isConditionalExpression(prop.value)) {
    const testValue = isDirectionTest(prop.value.test);
    if (!testValue) {
      report.skipped.push({ file: filePath, property: name, reason: 'conditional test is not a recognizable direction check' });
      return false;
    }
    newValueNode = testValue === 'ltr' ? prop.value.consequent : prop.value.alternate;
  }

  setKeyName(prop, newName);
  prop.value = newValueNode;
  report.converted.push({ file: filePath, from: name, to: newName });
  return true;
}

function convertPositionalProperty(prop, name, report, filePath, ctx) {
  const newName = POSITION_MAP[name];

  if (t.isConditionalExpression(prop.value)) {
    const testValue = isDirectionTest(prop.value.test);
    if (!testValue) {
      report.skipped.push({ file: filePath, property: name, reason: 'conditional test is not a recognizable direction check' });
      return false;
    }
    const ltrNode = testValue === 'ltr' ? prop.value.consequent : prop.value.alternate;
    const value = staticStringValue(ltrNode);
    if (value !== null && (isCentering(value) || isOffScreen(value))) {
      report.skipped.push({ file: filePath, property: name, reason: 'centering or off-screen value' });
      return false;
    }
    setKeyName(prop, newName);
    prop.value = ltrNode;
    report.converted.push({ file: filePath, from: name, to: newName });
    return true;
  }

  if (ctx.isFullOverlay) {
    report.skipped.push({ file: filePath, property: name, reason: 'full-overlay pattern (top/right/bottom/left all 0)' });
    return false;
  }

  const value = staticStringValue(prop.value);
  if (value !== null && (isCentering(value) || isOffScreen(value))) {
    report.skipped.push({ file: filePath, property: name, reason: 'centering or off-screen value' });
    return false;
  }

  setKeyName(prop, newName);
  report.converted.push({ file: filePath, from: name, to: newName });
  return true;
}

// margin/padding shorthand ternary -> split LTR value into *InlineStart/*InlineEnd (+ Top/Bottom if non-zero).
function convertShorthandTernary(prop, baseName, report, filePath) {
  const testValue = isDirectionTest(prop.value.test);
  if (!testValue) {
    report.skipped.push({ file: filePath, property: baseName, reason: 'conditional test is not a recognizable direction check' });
    return null;
  }
  const ltrNode = testValue === 'ltr' ? prop.value.consequent : prop.value.alternate;
  if (!t.isStringLiteral(ltrNode)) {
    report.skipped.push({ file: filePath, property: baseName, reason: 'shorthand value is not a string literal' });
    return null;
  }

  const parts = ltrNode.value.trim().split(/\s+/);
  let entries;
  if (parts.length === 4) {
    const [top, right, bottom, left] = parts;
    entries = [];
    if (!isZero(top)) entries.push([`${baseName}Top`, top]);
    if (!isZero(bottom)) entries.push([`${baseName}Bottom`, bottom]);
    entries.push([`${baseName}InlineStart`, left]);
    entries.push([`${baseName}InlineEnd`, right]);
  } else if (parts.length === 1) {
    entries = [
      [`${baseName}InlineStart`, parts[0]],
      [`${baseName}InlineEnd`, parts[0]],
    ];
  } else {
    report.skipped.push({ file: filePath, property: baseName, reason: `unsupported shorthand arity (${parts.length} values)` });
    return null;
  }

  report.converted.push({ file: filePath, from: `${baseName} (shorthand)`, to: entries.map((e) => e[0]).join('/') });
  return entries.map(([name, value]) => t.objectProperty(t.identifier(name), t.stringLiteral(value)));
}

function convertTextAlignTernary(prop, report, filePath) {
  const testValue = isDirectionTest(prop.value.test);
  if (!testValue) {
    report.skipped.push({ file: filePath, property: 'textAlign', reason: 'conditional test is not a recognizable direction check' });
    return false;
  }
  const ltrNode = testValue === 'ltr' ? prop.value.consequent : prop.value.alternate;
  if (!t.isStringLiteral(ltrNode)) {
    report.skipped.push({ file: filePath, property: 'textAlign', reason: 'value is not a string literal' });
    return false;
  }
  const map = { left: 'start', right: 'end' };
  const mapped = map[ltrNode.value];
  if (!mapped) return false;

  prop.value = t.stringLiteral(mapped);
  report.converted.push({ file: filePath, from: 'textAlign (conditional)', to: `textAlign: '${mapped}'` });
  return true;
}

function processObjectExpression(objExpr, report, filePath) {
  const props = objExpr.properties;
  const siblingValues = {};
  props.forEach((p) => {
    const name = getKeyName(p);
    if (name && (t.isStringLiteral(p.value) || t.isNumericLiteral(p.value))) {
      siblingValues[name] = staticStringValue(p.value);
    }
  });
  const isFullOverlay = ['top', 'left', 'right', 'bottom'].every(
    (k) => siblingValues[k] !== undefined && isZero(siblingValues[k])
  );

  const newProperties = [];
  let changed = false;

  props.forEach((prop) => {
    const name = getKeyName(prop);
    if (!name) {
      newProperties.push(prop);
      return;
    }

    // Redundant nested `&[dir="rtl"]` override block once logical properties are used.
    if (/\[dir=["']rtl["']\]/.test(name)) {
      report.removed.push({ file: filePath, property: name, reason: 'redundant [dir="rtl"] override block' });
      changed = true;
      return;
    }

    if (DIRECT_RENAME_MAP[name]) {
      if (convertDirectProperty(prop, name, report, filePath)) changed = true;
      newProperties.push(prop);
      return;
    }

    if ((name === 'margin' || name === 'padding') && t.isConditionalExpression(prop.value)) {
      const replacement = convertShorthandTernary(prop, name, report, filePath);
      if (replacement) {
        changed = true;
        newProperties.push(...replacement);
      } else {
        newProperties.push(prop);
      }
      return;
    }

    if (name === 'left' || name === 'right') {
      if (convertPositionalProperty(prop, name, report, filePath, { isFullOverlay })) changed = true;
      newProperties.push(prop);
      return;
    }

    if (name === 'textAlign' && t.isConditionalExpression(prop.value)) {
      if (convertTextAlignTernary(prop, report, filePath)) changed = true;
      newProperties.push(prop);
      return;
    }

    newProperties.push(prop);
  });

  if (changed) {
    objExpr.properties = newProperties;
  }
}

function transformJs(code, filePath) {
  const report = { converted: [], skipped: [], removed: [] };
  const ast = recast.parse(code, { parser: babelParser });

  traverse(ast, {
    ObjectExpression(path) {
      processObjectExpression(path.node, report, filePath);
    },
  });

  const output = recast.print(ast).code;
  return { code: output, report };
}

module.exports = { transformJs };
