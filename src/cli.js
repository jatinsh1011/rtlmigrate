const path = require('path');
const { Command } = require('commander');
const fg = require('fast-glob');
const { createPatch } = require('diff');
const pc = require('picocolors');
const { processFile } = require('./fileProcessor');
const pkg = require('../package.json');

function run(argv) {
  const program = new Command();

  program
    .name('rtlmigrate')
    .description('Convert LTR physical CSS / CSS-in-JS properties to RTL-ready logical properties')
    .argument('<patterns...>', 'file(s) or glob pattern(s) to process')
    .option('-w, --write', 'write changes to disk (default: dry-run, prints a diff only)', false)
    .option('--keep-rtl-overrides', 'do not remove [dir="rtl"] override blocks', false)
    .version(pkg.version)
    .parse(argv);

  const opts = program.opts();
  const patterns = program.args;
  const files = fg.sync(patterns, { onlyFiles: true, absolute: true, dot: false });

  if (!files.length) {
    console.error(pc.yellow('No files matched the given pattern(s).'));
    process.exitCode = 1;
    return;
  }

  let anyChanged = false;
  let errorCount = 0;

  for (const file of files) {
    try {
      const result = processFile(file, { write: opts.write, keepRtlOverrides: opts.keepRtlOverrides });
      if (result.skippedFile) continue;

      const relPath = path.relative(process.cwd(), file);
      if (!result.changed) {
        console.log(pc.gray(`No changes: ${relPath}`));
        continue;
      }

      anyChanged = true;
      console.log(pc.bold(pc.cyan(`\n${relPath}`)));
      result.report.converted.forEach((c) => console.log(pc.green(`  + ${c.from} \u2192 ${c.to}`)));
      result.report.removed.forEach((r) =>
        console.log(pc.yellow(`  - removed: ${r.selector || r.property} (${r.reason})`))
      );
      result.report.skipped.forEach((s) => console.log(pc.gray(`  ~ skipped: ${s.property} (${s.reason})`)));

      if (opts.write) {
        console.log(pc.green('  \u2714 written'));
      } else {
        console.log(createPatch(file, result.original, result.output, '', ''));
      }
    } catch (err) {
      errorCount += 1;
      console.error(pc.red(`Error processing ${file}: ${err.message}`));
    }
  }

  if (!anyChanged) {
    console.log(pc.gray('\nNo properties needed conversion.'));
  } else if (!opts.write) {
    console.log(pc.yellow('\nDry run only \u2014 re-run with --write to apply changes.'));
  }

  process.exitCode = errorCount ? 1 : 0;
}

module.exports = { run };
