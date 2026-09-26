// Value-based heuristics used to avoid converting left/right that aren't directional.

function isCentering(value) {
  return /^-?50%$/.test(String(value).trim());
}

function isOffScreen(value) {
  const match = String(value).trim().match(/^-(\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return false;
  return parseFloat(match[1]) >= 999;
}

function isZero(value) {
  return /^0(px|em|rem|%)?$/.test(String(value).trim());
}

module.exports = { isCentering, isOffScreen, isZero };
