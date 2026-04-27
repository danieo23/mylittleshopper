/**
 * CIE76 Delta-E perceptual color distance — no external dependencies.
 *
 * Pipeline: hex → sRGB → linear RGB → XYZ (D65) → CIE Lab → Euclidean distance
 *
 * Thresholds used by the scorer:
 *   deltaE < 5   → visually identical (exact match for scoring purposes)
 *   5 ≤ deltaE < 25  → close color (partial match)
 *   deltaE ≥ 25  → clearly different (no match)
 */

function hexToRgb(hex) {
  const h = (hex ?? '').replace('#', '').padEnd(6, '0');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function rgbToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearToXyz(r, g, b) {
  // D65 illuminant sRGB → XYZ matrix
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

function xyzToLab(x, y, z) {
  const xn = 0.95047, yn = 1.00000, zn = 1.08883; // D65 white point
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Convert a hex color string to CIE Lab [L, a, b].
 * Returns null for invalid input.
 */
export function hexToLab(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const [r, g, b]   = hexToRgb(hex);
  const lr = rgbToLinear(r), lg = rgbToLinear(g), lb = rgbToLinear(b);
  const [x, y, z]   = linearToXyz(lr, lg, lb);
  return xyzToLab(x, y, z);
}

/**
 * CIE76 Euclidean distance between two Lab values.
 * Returns 100 (max mismatch) when either input is null.
 */
export function deltaE(lab1, lab2) {
  if (!lab1 || !lab2) return 100;
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Compare two hex colors and return whether they are perceptually close.
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} threshold - deltaE threshold for match (default 25)
 * @returns {{ match: boolean, distance: number }}
 */
export function colorMatch(hex1, hex2, threshold = 25) {
  const lab1     = hexToLab(hex1);
  const lab2     = hexToLab(hex2);
  const distance = deltaE(lab1, lab2);
  return { match: distance < threshold, distance };
}

/**
 * Find the minimum Delta-E distance between one DNA hex color and an array of product hex colors.
 * Returns 100 when either list is empty.
 */
export function minDeltaE(dnaHex, productHexes) {
  if (!dnaHex || !productHexes?.length) return 100;
  const dnaLab = hexToLab(dnaHex);
  if (!dnaLab) return 100;
  return Math.min(...productHexes.map(h => deltaE(dnaLab, hexToLab(h))));
}
