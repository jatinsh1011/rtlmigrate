const postcss = require('postcss');
const scss = require('postcss-scss');
const { CSS_DIRECT_RENAME_MAP, CSS_POSITION_MAP } = require('../rules/propertyMap');
const { isCentering, isOffScreen, isZero } = require('../rules/heuristics');

function transformCss(code, filePath, opts = {}) {
  const report = { converted: [], skipped: [], removed: [] };
  const syntax = filePath.endsWith('.scss') ? scss : undefined;
  const root = postcss.parse(code, { syntax });

  root.walkRules((rule) => {
    if (/\[dir=["']rtl["']\]/.test(rule.selector)) {
      if (!opts.keepRtlOverrides) {
        report.removed.push({ file: filePath, selector: rule.selector, reason: 'redundant [dir="rtl"] override block' });
        rule.remove();
      }
      return;
    }

    const values = {};
    rule.walkDecls((d) => {
      values[d.prop.toLowerCase()] = d.value;
    });
    const isFullOverlay = ['top', 'left', 'right', 'bottom'].every(
      (k) => values[k] !== undefined && isZero(values[k])
    );

    rule.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();

      if (CSS_DIRECT_RENAME_MAP[prop]) {
        report.converted.push({ file: filePath, from: prop, to: CSS_DIRECT_RENAME_MAP[prop] });
        decl.prop = CSS_DIRECT_RENAME_MAP[prop];
        return;
      }

      if (prop === 'left' || prop === 'right') {
        if (isFullOverlay) {
          report.skipped.push({ file: filePath, property: prop, reason: 'full-overlay pattern (top/right/bottom/left all 0)' });
          return;
        }
        if (isCentering(decl.value) || isOffScreen(decl.value)) {
          report.skipped.push({ file: filePath, property: prop, reason: 'centering or off-screen value' });
          return;
        }
        report.converted.push({ file: filePath, from: prop, to: CSS_POSITION_MAP[prop] });
        decl.prop = CSS_POSITION_MAP[prop];
        return;
      }

      if (prop === 'margin' || prop === 'padding') {
        const parts = decl.value.trim().split(/\s+/);
        if (parts.length === 4) {
          const [top, right, bottom, left] = parts;
          const decls = [];
          if (!isZero(top)) decls.push(postcss.decl({ prop: `${prop}-top`, value: top }));
          if (!isZero(bottom)) decls.push(postcss.decl({ prop: `${prop}-bottom`, value: bottom }));
          decls.push(postcss.decl({ prop: `${prop}-inline-start`, value: left }));
          decls.push(postcss.decl({ prop: `${prop}-inline-end`, value: right }));
          decl.replaceWith(decls);
          report.converted.push({ file: filePath, from: `${prop} (shorthand)`, to: `${prop}-inline-start/${prop}-inline-end` });
        } else if (parts.length === 1) {
          decl.replaceWith(
            postcss.decl({ prop: `${prop}-inline-start`, value: parts[0] }),
            postcss.decl({ prop: `${prop}-inline-end`, value: parts[0] })
          );
          report.converted.push({ file: filePath, from: prop, to: `${prop}-inline-start/${prop}-inline-end` });
        } else {
          report.skipped.push({ file: filePath, property: prop, reason: `unsupported shorthand arity (${parts.length} values)` });
        }
      }
    });
  });

  return { code: root.toString(), report };
}

module.exports = { transformCss };
