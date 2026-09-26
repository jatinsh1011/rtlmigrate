import { describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const { transformCss } = require('../src/transformers/cssTransform');

describe('transformCss', () => {
  it('converts physical properties and removes redundant [dir="rtl"] rules', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample.css');
    const code = fs.readFileSync(fixturePath, 'utf8');
    const { code: output, report } = transformCss(code, fixturePath, {});

    expect(output).toContain('margin-inline-start');
    expect(output).toContain('margin-inline-end');
    expect(output).toContain('border-start-start-radius');
    expect(output).toContain('left: 50%');
    expect(output).not.toContain('[dir="rtl"]');
    expect(report.converted.length).toBeGreaterThan(0);
    expect(report.removed.length).toBe(1);
  });

  it('keeps [dir="rtl"] rules when --keep-rtl-overrides is set', () => {
    const code = `.box[dir="rtl"] { margin-left: 0; }`;
    const { code: output } = transformCss(code, 'test.css', { keepRtlOverrides: true });
    expect(output).toContain('[dir="rtl"]');
  });
});
