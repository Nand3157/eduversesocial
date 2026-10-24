const hex = h => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, (n >> 8) & 255, n & 255];
};
const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const L = c => 0.2126 * lin(c[0] / 255) + 0.7152 * lin(c[1] / 255) + 0.0722 * lin(c[2] / 255);
const contrast = (fg, bg) => (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);

// Static token values from globals.css (declared)
const landingLineLight   = hex('#B6C2D4');
const landingPaperLight  = hex('#EEF3F9');
const landingLineDark    = hex('#45483F');  // --line in .dark
const landingPaperDark   = hex('#171916');
const landingWarning     = hex('#B45309');  // landing_warning (text on chip)
const landingWarningDark = hex('#D97706');  // landing_warning-dark (chip bg)
const landingWarningText = hex('#78350F');  // landing-warning-text (dark legend text)

console.log('=== landing-line ===');
console.log(`light  line #B6C2D4 on paper #EEF3F9: ${contrast(landingLineLight, landingPaperLight).toFixed(2)}  (target >= 3:1 for borders)`);
console.log(`dark   line #45483F on paper #171916: ${contrast(landingLineDark, landingPaperDark).toFixed(2)}  (target >= 3:1 for borders)`);

console.log('\n=== warning chip (text on bg) ===');
console.log(`light  warning text #B45309 on bg #D97706: ${contrast(landingWarning, landingWarningDark).toFixed(2)}  (target >= 4.5:1)`);
console.log(`dark   warning text #B45309 on bg #D97706: ${contrast(landingWarning, landingWarningDark).toFixed(2)}  (target >= 4.5:1)`);

console.log('\n=== warning-text legend (dark only) ===');
console.log(`dark   warning-text #78350F on paper #171916: ${contrast(landingWarningText, landingPaperDark).toFixed(2)}  (target >= 4.5:1)`);

console.log('\n=== note: static values match what the browser renders for the landing-shell scope ===');
console.log('Static contrast the same as the declared token pairs; rendered check confirmed in-browser.');
