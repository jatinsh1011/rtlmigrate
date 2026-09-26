import { describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const { transformJs } = require('../src/transformers/jsTransform');

describe('transformJs', () => {
  it('converts physical properties to logical equivalents', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample.styles.js');
    const code = fs.readFileSync(fixturePath, 'utf8');
    const { code: output, report } = transformJs(code, fixturePath);

    expect(output).toContain('marginInlineStart');
    expect(output).toContain('marginInlineEnd');
    expect(output).toContain('paddingInlineStart');
    expect(output).toContain('paddingInlineEnd');
    expect(output).toContain('borderStartStartRadius');
    expect(output).toContain('textAlign: "start"');
    expect(output).not.toContain('[dir="rtl"]');
    expect(output).toContain("left: '50%'");
    expect(report.converted.length).toBeGreaterThan(0);
    expect(report.removed.length).toBe(1);
  });

  it('does not convert left: 50% (centering)', () => {
    const code = `const s = { left: '50%' };`;
    const { code: output } = transformJs(code, 'test.js');
    expect(output).toContain("left: '50%'");
  });

  it('skips full-overlay top/right/bottom/left: 0 patterns', () => {
    const code = `const s = { top: '0', right: '0', bottom: '0', left: '0' };`;
    const { code: output, report } = transformJs(code, 'test.js');
    expect(output).toContain("right: '0'");
    expect(output).toContain("left: '0'");
    expect(report.skipped.some((s) => s.reason.includes('full-overlay'))).toBe(true);
  });
});
