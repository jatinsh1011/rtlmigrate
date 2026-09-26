# rtl-migrate-cli

CLI + codemod that converts physical LTR CSS / CSS-in-JS properties to
[CSS logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values),
so styles work correctly in both LTR and RTL layouts without direction-based branching.

```
marginLeft            -> marginInlineStart
marginRight            -> marginInlineEnd
paddingLeft            -> paddingInlineStart
paddingRight           -> paddingInlineEnd
borderLeft             -> borderInlineStart
borderRight            -> borderInlineEnd
borderTopLeftRadius    -> borderStartStartRadius
borderTopRightRadius   -> borderStartEndRadius
borderBottomLeftRadius -> borderEndStartRadius
borderBottomRightRadius-> borderEndEndRadius
left / right (position)-> insetInlineStart / insetInlineEnd
textAlign: 'left'|'right' (in a direction conditional) -> 'start' | 'end'
```

It understands two kinds of files:

- **JS/TS style objects** (`makeStyles`, `sx`, inline `style={{ ... }}`, plain style objects) —
  parsed and rewritten with Babel + [recast](https://github.com/benjamn/recast), so untouched code
  keeps its original formatting.
- **CSS / SCSS files** — rewritten with PostCSS.

## Install

```bash
npm install -g rtl-migrate-cli
# or run without installing:
npx rtl-migrate-cli "src/**/*.styles.js"
```

The CLI command is `rtlmigrate`.

## Usage

```bash
# Dry run (default): prints a diff, does not touch files
rtlmigrate "src/**/*.styles.js" "src/**/*.css"

# Apply changes
rtlmigrate "src/**/*.styles.js" --write

# Keep existing [dir="rtl"] override blocks instead of removing them
rtlmigrate "src/**/*.css" --write --keep-rtl-overrides
```

### Options

| Flag                     | Description                                                        |
|--------------------------|----------------------------------------------------------------------|
| `-w, --write`            | Write changes to disk. Without it, `rtlmigrate` only prints a diff.  |
| `--keep-rtl-overrides`   | Don't remove `[dir="rtl"]` override blocks/rules.                    |
| `-V, --version`          | Print the installed version.                                         |

## Conversion rules

- **Ternary with a direction condition** (`direction === 'ltr' ? a : b`) — the LTR branch is kept,
  the condition is dropped.
- **Shorthand ternary** (`margin`/`padding` with a 4-value string) — split into
  `*InlineStart`/`*InlineEnd` (plus `*Top`/`*Bottom` if non-zero).
- **Static values** — the property is renamed only, value untouched.
- **`left`/`right` positioning** is only converted when it looks directional. It is skipped for:
  - centering (`left: '50%'`)
  - full overlays (`top/right/bottom/left` all `0` on the same rule/object)
  - off-screen hiding (e.g. `left: '-9999px'`)
- **`[dir="rtl"]` override blocks** are removed once they become redundant (opt out with
  `--keep-rtl-overrides`).
- `box-shadow`, `transform`, and `inset(...)` values are never touched. `shouldForwardProp` arrays,
  `PropTypes`, and commented-out code are never touched (the transform only targets real style
  object properties and CSS declarations).

## Programmatic API

```js
const { transformJs, transformCss, processFile } = require('rtl-migrate-cli');

const { code, report } = transformJs(sourceCode, 'Component.styles.js');
// report.converted / report.skipped / report.removed
```

## Limitations / roadmap

- Template-literal CSS-in-JS (`styled.div\`...\``, emotion `css\`...\``) is not yet parsed — only
  JS object-based styles and `.css`/`.scss` files are supported today.
- `margin`/`padding` shorthand splitting only supports 1-value and 4-value forms; 2/3-value
  shorthands are left untouched and reported as skipped.
- Direction-check detection is heuristic (`x === 'ltr'|'rtl'`); unusual condition shapes are
  reported as skipped rather than guessed at.

Contributions welcome — please open an issue/PR for additional CSS-in-JS flavors or shorthand
patterns.

## Publishing (maintainer notes)

```bash
npm login
npm publish --access public
git init && git add -A && git commit -m "Initial release"
git remote add origin git@github.com:jatinsh1011/rtl-migrate-cli.git
git push -u origin main
```

## License

MIT
