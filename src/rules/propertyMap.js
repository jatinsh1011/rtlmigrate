// Physical -> logical property maps for JS style objects (camelCase) and CSS (kebab-case).

const DIRECT_RENAME_MAP = {
  marginLeft: 'marginInlineStart',
  marginRight: 'marginInlineEnd',
  paddingLeft: 'paddingInlineStart',
  paddingRight: 'paddingInlineEnd',
  borderLeft: 'borderInlineStart',
  borderRight: 'borderInlineEnd',
  borderTopLeftRadius: 'borderStartStartRadius',
  borderTopRightRadius: 'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius: 'borderEndEndRadius',
};

const CSS_DIRECT_RENAME_MAP = {
  'margin-left': 'margin-inline-start',
  'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start',
  'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start',
  'border-right': 'border-inline-end',
  'border-top-left-radius': 'border-start-start-radius',
  'border-top-right-radius': 'border-start-end-radius',
  'border-bottom-left-radius': 'border-end-start-radius',
  'border-bottom-right-radius': 'border-end-end-radius',
};

const POSITION_MAP = { left: 'insetInlineStart', right: 'insetInlineEnd' };
const CSS_POSITION_MAP = { left: 'inset-inline-start', right: 'inset-inline-end' };

module.exports = {
  DIRECT_RENAME_MAP,
  CSS_DIRECT_RENAME_MAP,
  POSITION_MAP,
  CSS_POSITION_MAP,
};
