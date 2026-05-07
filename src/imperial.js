// src/imperial.js

// Parse an imperial dimension string to decimal inches.
// Accepts: "12'", '6"', "12' 6\"", "12' 6 3/4\"", '3/4"', '6 3/4"', bare number (treated as inches)
export function parseIn(str) {
  str = String(str).trim();
  if (str === '') throw new Error('Empty input');

  let inches = 0;

  // feet
  const feetMatch = str.match(/(\d+)'/);
  if (feetMatch) inches += parseInt(feetMatch[1], 10) * 12;

  // Remove feet part for further parsing
  const rest = str.replace(/\d+'/, '').trim().replace(/"/g, '').trim();

  if (rest) {
    // fraction: "3/4" or "6 3/4"
    const fracMatch = rest.match(/^(\d+)\s+(\d+)\/(\d+)$|^(\d+)\/(\d+)$|^(\d+(?:\.\d+)?)$/);
    if (!fracMatch) throw new Error(`Cannot parse: "${str}"`);
    if (fracMatch[1] !== undefined) {
      // whole + fraction
      inches += parseInt(fracMatch[1], 10) + parseInt(fracMatch[2], 10) / parseInt(fracMatch[3], 10);
    } else if (fracMatch[4] !== undefined) {
      // fraction only
      inches += parseInt(fracMatch[4], 10) / parseInt(fracMatch[5], 10);
    } else {
      // plain number
      inches += parseFloat(fracMatch[6]);
    }
  }

  if (inches < 0) throw new Error('Negative dimension');
  return inches;
}

// Format decimal inches to a readable imperial string.
export function formatIn(totalInches) {
  const FRACTIONS = [
    [15/16, '15/16'], [7/8, '7/8'], [13/16, '13/16'], [3/4, '3/4'],
    [11/16, '11/16'], [5/8, '5/8'], [9/16, '9/16'], [1/2, '1/2'],
    [7/16, '7/16'], [3/8, '3/8'], [5/16, '5/16'], [1/4, '1/4'],
    [3/16, '3/16'], [1/8, '1/8'], [1/16, '1/16'],
  ];

  const feet = Math.floor(totalInches / 12);
  let rem = totalInches - feet * 12;
  const wholeIn = Math.floor(rem);
  const frac = rem - wholeIn;

  let fracStr = '';
  if (frac > 0.001) {
    const match = FRACTIONS.find(([v]) => Math.abs(frac - v) < 0.03);
    fracStr = match ? ` ${match[1]}` : '';
  }

  if (feet > 0) return `${feet}' ${wholeIn}${fracStr}"`;
  if (wholeIn > 0) return `${wholeIn}${fracStr}"`;
  return fracStr ? `${fracStr.trim()}"` : '0"';
}

// Inches to centimeters
export function toMetric(inches) {
  return Math.round(inches * 2.54 * 100) / 100;
}

// Centimeters to inches
export function fromMetric(cm) {
  return cm / 2.54;
}
